import { BadRequestException, Injectable } from '@nestjs/common';
import { Connection, PublicKey } from '@solana/web3.js';
import { readOptionalEnv } from '../../common/env';
import type { RuntimeNetwork } from './staking.types';

@Injectable()
export class StakingSolanaConnectionService {
  private readonly solanaConnectionByNetwork = new Map<
    RuntimeNetwork,
    Connection
  >();

  getSolanaConnection(network: RuntimeNetwork): Connection {
    const existing = this.solanaConnectionByNetwork.get(network);
    if (existing) return existing;

    const connection = new Connection(
      this.resolveSolanaRpcUrl(network),
      'confirmed',
    );
    this.solanaConnectionByNetwork.set(network, connection);
    return connection;
  }

  async assertInstructionExecutionReady(
    network: RuntimeNetwork,
    programId: string,
  ) {
    const connection = this.getSolanaConnection(network);
    const [programInfo] = await connection.getMultipleAccountsInfo(
      [new PublicKey(programId)],
      'confirmed',
    );

    if (!programInfo?.executable) {
      throw new BadRequestException(
        'Staking program is not deployed or not executable on this network.',
      );
    }
  }

  async isProgramOwnedAccount(
    network: RuntimeNetwork,
    address: string,
    ownerProgramId: string,
  ): Promise<boolean> {
    const info = await this.getSolanaConnection(network).getAccountInfo(
      new PublicKey(address),
      'confirmed',
    );
    return Boolean(info && info.owner.toBase58() === ownerProgramId);
  }

  async getRewardVaultBalance(
    network: RuntimeNetwork,
    rewardVaultAddress: string | null,
  ): Promise<number> {
    if (!rewardVaultAddress) {
      return 0;
    }

    try {
      const balance = await this.getSolanaConnection(
        network,
      ).getTokenAccountBalance(new PublicKey(rewardVaultAddress), 'confirmed');
      return (
        Number(balance.value.uiAmountString ?? balance.value.uiAmount ?? 0) || 0
      );
    } catch {
      return 0;
    }
  }

  private resolveSolanaRpcUrl(network: RuntimeNetwork): string {
    const envName =
      network === 'mainnet'
        ? 'SOLANA_MAINNET_RPC_URL'
        : 'SOLANA_DEVNET_RPC_URL';
    const value = readOptionalEnv(envName);
    if (!value) {
      throw new BadRequestException(`${envName} is not configured.`);
    }
    return value;
  }
}
