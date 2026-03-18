import { useEffect, useSyncExternalStore } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { fetchMarketMintSnapshots } from "@/lib/market/market-data-client";
import {
  METAPLEX_METADATA_PROGRAM_ID,
  SPL_TOKEN_2022_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT_ADDRESS,
} from "@/lib/solana/solana-constants";

function parseMetaplexMetadata(data: Uint8Array | Buffer) {
    try {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        let offset = 65;
        const nameLen = view.getUint32(offset, true);
        const name = new TextDecoder().decode(data.slice(offset + 4, offset + 4 + nameLen)).replace(/\0/g, '').trim();
        offset += 4 + nameLen;
        const symbolLen = view.getUint32(offset, true);
        const symbol = new TextDecoder().decode(data.slice(offset + 4, offset + 4 + symbolLen)).replace(/\0/g, '').trim();
        return { name, symbol };
    } catch {
        return null;
    }
}

export interface SolanaTokenBalance {
    id: string; // mint address
    ticker: string;
    name: string;
    amount: number;
    priceUsd: number;
    logoUrl: string;
    change24h: number;
    decimals: number;
}

const METADATA_BATCH_SIZE = 10;
const PORTFOLIO_CACHE_TTL_MS = 20_000;

interface MarketMintSnapshot {
    mint: string;
    ticker: string;
    name: string;
    priceUsd: number;
    change24h: number;
    logoUrl: string;
}

interface MarketMintSnapshotResponse {
    items?: MarketMintSnapshot[];
}

interface PortfolioStoreState {
    walletKey: string | null;
    tokens: SolanaTokenBalance[];
    isLoading: boolean;
    error: string | null;
    updatedAt: number;
}

type PortfolioListener = () => void;

const listeners = new Set<PortfolioListener>();
const inFlightByWalletKey = new Map<string, Promise<void>>();

let sharedState: PortfolioStoreState = {
    walletKey: null,
    tokens: [],
    isLoading: false,
    error: null,
    updatedAt: 0,
};

const getWalletKey = (connection: { rpcEndpoint: string }, publicKey: PublicKey) =>
    `${connection.rpcEndpoint}|${publicKey.toBase58()}`;

const publish = () => {
    for (const listener of listeners) {
        listener();
    }
};

const patchSharedState = (patch: Partial<PortfolioStoreState>) => {
    sharedState = {
        ...sharedState,
        ...patch,
    };
    publish();
};

const subscribePortfolio = (listener: PortfolioListener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const getPortfolioSnapshot = () => sharedState;

export const refreshSolanaPortfolioForWallet = async (
    connection: ReturnType<typeof useConnection>["connection"],
    publicKey: PublicKey,
    options?: { clearFirst?: boolean },
) => {
    const walletKey = getWalletKey(connection, publicKey);
    if (options?.clearFirst) {
        patchSharedState({
            walletKey,
            tokens: [],
            isLoading: true,
            error: null,
            updatedAt: Date.now(),
        });
    }
    await ensurePortfolioLoaded(connection, publicKey, true);
};

const fetchSolanaPortfolio = async (
    connection: ReturnType<typeof useConnection>["connection"],
    publicKey: PublicKey,
): Promise<{ tokens: SolanaTokenBalance[]; error: string | null }> => {
    // Fetch SOL balance
    let solBalanceLamports = 0;
    let isSolLoaded = false;
    try {
        solBalanceLamports = await connection.getBalance(publicKey);
        isSolLoaded = true;
    } catch {
        // Ignore transient RPC failures. We can still build partial portfolio from token accounts.
    }
    const solAmount = solBalanceLamports / 1e9;
    const solMint = WRAPPED_SOL_MINT_ADDRESS;

    // Fetch SPL tokens from both legacy Token Program and Token-2022 Program.
    const tokenAccountFetches = await Promise.allSettled([
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: SPL_TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: SPL_TOKEN_2022_PROGRAM_ID }),
    ]);
    const parsedTokenAccounts = tokenAccountFetches.flatMap((result) =>
        result.status === "fulfilled" ? result.value.value : [],
    );
    const isTokenAccountsLoaded = tokenAccountFetches.some((result) => result.status === "fulfilled");

    let mints = [solMint];
    const balancesByMint: Record<string, { amount: number; decimals: number; uiAmount: number }> = {
        [solMint]: { amount: solBalanceLamports, decimals: 9, uiAmount: solAmount },
    };

    for (const ta of parsedTokenAccounts) {
        const parsedInfo = ta.account.data.parsed?.info;
        if (!parsedInfo) continue;

        const uiAmount = parsedInfo.tokenAmount.uiAmount || 0;
        if (uiAmount > 0) {
            const mint = parsedInfo.mint;
            mints.push(mint);
            balancesByMint[mint] = {
                amount: Number(parsedInfo.tokenAmount.amount) || 0,
                decimals: parsedInfo.tokenAmount.decimals || 0,
                uiAmount,
            };
        }
    }

    // Limit mints slightly for DexScreener API (max 30 addresses)
    mints = mints.slice(0, 30);

    // Fetch raw token metadatas from Metaplex
    const metadataPdas = mints.map(m => {
        const mintPubkey = new PublicKey(m);
        const seeds = [
            new TextEncoder().encode("metadata"),
            METAPLEX_METADATA_PROGRAM_ID.toBytes(),
            mintPubkey.toBytes()
        ];
        return PublicKey.findProgramAddressSync(seeds, METAPLEX_METADATA_PROGRAM_ID)[0];
    });

    const onChainMetadata: Record<string, { name: string, symbol: string }> = {};
    for (let offset = 0; offset < metadataPdas.length; offset += METADATA_BATCH_SIZE) {
        const pdaChunk = metadataPdas.slice(offset, offset + METADATA_BATCH_SIZE);
        const mintChunk = mints.slice(offset, offset + METADATA_BATCH_SIZE);

        try {
            const accountInfos = await connection.getMultipleAccountsInfo(pdaChunk);
            mintChunk.forEach((mint, idx) => {
                const accInfo = accountInfos[idx];
                if (!accInfo?.data) return;
                const parsed = parseMetaplexMetadata(accInfo.data);
                if (parsed) {
                    onChainMetadata[mint] = parsed;
                }
            });
        } catch {
            // Metaplex metadata is optional; keep rendering with fallback token names.
        }
    }

    const marketSnapshotByMint = new Map<string, MarketMintSnapshot>();
    if (mints.length > 0) {
        try {
            const response = await fetchMarketMintSnapshots<MarketMintSnapshotResponse>(mints);
            for (const item of response.items ?? []) {
                if (!item?.mint) continue;
                marketSnapshotByMint.set(item.mint, item);
            }
        } catch {
            // Pricing is optional; we can still render balances without market quotes.
        }
    }

    const enrichedTokens: SolanaTokenBalance[] = [];

    for (const mint of mints) {
        const bal = balancesByMint[mint];
        if (!bal) continue;

        const marketSnapshot = marketSnapshotByMint.get(mint);
        const onChain = onChainMetadata[mint];

        const fallbackTicker = mint === solMint ? 'SOL' : mint.slice(0, 4).toUpperCase();
        const fallbackName = mint === solMint ? 'Solana' : 'Token';

        enrichedTokens.push({
            id: mint,
            ticker: marketSnapshot?.ticker || onChain?.symbol || fallbackTicker,
            name: marketSnapshot?.name || onChain?.name || fallbackName,
            amount: bal.uiAmount,
            priceUsd: Number(marketSnapshot?.priceUsd) || 0,
            change24h: Number(marketSnapshot?.change24h) || 0,
            logoUrl: marketSnapshot?.logoUrl || '',
            decimals: bal.decimals,
        });
    }

    // Sort by USD value DESC, then by amount DESC
    enrichedTokens.sort((a, b) => {
        const valA = a.amount * a.priceUsd;
        const valB = b.amount * b.priceUsd;
        if (valA !== valB) return valB - valA;
        return b.amount - a.amount;
    });

    const error = !isSolLoaded && !isTokenAccountsLoaded
        ? "Unable to reach Solana RPC right now. Please retry."
        : null;

    return {
        tokens: enrichedTokens,
        error,
    };
};

const ensurePortfolioLoaded = async (
    connection: ReturnType<typeof useConnection>["connection"],
    publicKey: PublicKey,
    force = false,
) => {
    const walletKey = getWalletKey(connection, publicKey);
    const now = Date.now();

    if (
        !force &&
        sharedState.walletKey === walletKey &&
        !sharedState.isLoading &&
        now - sharedState.updatedAt < PORTFOLIO_CACHE_TTL_MS
    ) {
        return;
    }

    const existing = inFlightByWalletKey.get(walletKey);
    if (existing) {
        if (sharedState.walletKey !== walletKey || !sharedState.isLoading) {
            patchSharedState({ walletKey, isLoading: true, error: null });
        }
        await existing;
        return;
    }

    patchSharedState({
        walletKey,
        isLoading: true,
        error: null,
        ...(sharedState.walletKey !== walletKey ? { tokens: [] } : {}),
    });

    const loadPromise = (async () => {
        try {
            const result = await fetchSolanaPortfolio(connection, publicKey);

            if (sharedState.walletKey !== walletKey) {
                return;
            }

            patchSharedState({
                tokens: result.tokens,
                error: result.error,
                isLoading: false,
                updatedAt: Date.now(),
            });
        } catch {
            if (sharedState.walletKey !== walletKey) {
                return;
            }

            patchSharedState({
                isLoading: false,
                error: "Failed to fetch wallet balances",
                updatedAt: Date.now(),
            });
        }
    })();

    inFlightByWalletKey.set(walletKey, loadPromise);

    try {
        await loadPromise;
    } finally {
        inFlightByWalletKey.delete(walletKey);
    }
};

export function useSolanaPortfolio() {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const snapshot = useSyncExternalStore(subscribePortfolio, getPortfolioSnapshot, getPortfolioSnapshot);

    useEffect(() => {
        if (!publicKey) {
            patchSharedState({
                walletKey: null,
                tokens: [],
                isLoading: false,
                error: null,
                updatedAt: Date.now(),
            });
            return;
        }

        void ensurePortfolioLoaded(connection, publicKey);
    }, [connection, publicKey]);

    const walletKey = publicKey ? getWalletKey(connection, publicKey) : null;
    const isCurrentWalletSnapshot = snapshot.walletKey === walletKey;

    const refreshPortfolio = async (options?: { clearFirst?: boolean }) => {
        if (!publicKey) return;
        await refreshSolanaPortfolioForWallet(connection, publicKey, options);
    };

    return {
        portfolio: isCurrentWalletSnapshot ? snapshot.tokens : [],
        isLoading: walletKey ? (isCurrentWalletSnapshot ? snapshot.isLoading : true) : false,
        error: isCurrentWalletSnapshot ? snapshot.error : null,
        updatedAt: isCurrentWalletSnapshot ? snapshot.updatedAt : 0,
        refreshPortfolio,
    };
}
