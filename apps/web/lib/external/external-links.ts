import type { HeaderNetwork } from "../header/header-branding"

export const DEXSCREENER_BASE_URL = "https://dexscreener.com"
export const DEXSCREENER_IMAGE_HOSTNAME = "cdn.dexscreener.com"
export const JUPITER_SWAP_BASE_URL = "https://jup.ag"
export const RAYDIUM_SWAP_BASE_URL = "https://raydium.io/swap"
export const SOLSCAN_BASE_URL = "https://solscan.io"

const withOptionalNetworkCluster = (
  url: URL,
  network: HeaderNetwork | null | undefined,
) => {
  if (network === "devnet") {
    url.searchParams.set("cluster", "devnet")
  }

  return url.toString()
}

export const buildRaydiumSwapUrl = (inputMint: string, outputMint: string) => {
  const url = new URL(RAYDIUM_SWAP_BASE_URL)
  url.searchParams.set("inputMint", inputMint)
  url.searchParams.set("outputMint", outputMint)
  return url.toString()
}

export const buildJupiterSwapUrl = (sellMint: string, buyMint: string) => {
  const url = new URL(JUPITER_SWAP_BASE_URL)
  url.searchParams.set("sell", sellMint)
  url.searchParams.set("buy", buyMint)
  return url.toString()
}

export const buildDexScreenerPoolUrl = (poolId: string) =>
  `${DEXSCREENER_BASE_URL}/solana/${poolId.toLowerCase()}`

export const buildSolscanTokenUrl = (
  mintAddress: string,
  network?: HeaderNetwork | null,
) => {
  const url = new URL(`/token/${encodeURIComponent(mintAddress)}`, SOLSCAN_BASE_URL)
  return withOptionalNetworkCluster(url, network)
}
