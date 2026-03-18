import { createHash, randomUUID } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { buildSolscanTxUrl } from '../../common/external.constants';
import { getSharedRedisJsonCache } from '../../common/redis-cache';
import type { ExecuteAdminStakingInstructionDto } from './dto/execute-admin-staking-instruction.dto';
import { StakingMirrorService } from './staking-mirror.service';
import { StakingSolanaConnectionService } from './staking-solana-connection.service';
import type {
  AdminStakingExecutionPayload,
  PreparedAdminStakingExecution,
  RuntimeNetwork,
} from './staking.types';
import type {
  FundingBatchExecutionMetadata,
  PreparedAdminExecutionSession,
} from './staking-admin-session.types';

const ADMIN_STAKING_SESSION_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class StakingAdminExecutionService {
  private readonly redisJsonCache = getSharedRedisJsonCache();
  private readonly logger = new Logger(StakingAdminExecutionService.name);

  constructor(
    private readonly connectionService: StakingSolanaConnectionService,
    private readonly stakingMirror: StakingMirrorService,
  ) {}

  assertAdminWalletMatches(walletAddress: string) {
    if (!walletAddress) {
      throw new BadRequestException('Admin wallet address is required.');
    }
    try {
      new PublicKey(walletAddress);
    } catch {
      throw new BadRequestException('Admin wallet address is invalid.');
    }
  }

  async prepareInstructionExecution(input: {
    network: RuntimeNetwork;
    action: PreparedAdminStakingExecution['action'];
    walletAddress: string;
    instruction: PreparedAdminStakingExecution['instructionPayload'] | null;
    instructions?: TransactionInstruction[];
    metadata?: FundingBatchExecutionMetadata;
  }): Promise<PreparedAdminStakingExecution> {
    if (!input.instruction) {
      throw new BadRequestException(
        'Instruction payload is not available for this staking action.',
      );
    }

    await this.connectionService.assertInstructionExecutionReady(
      input.network,
      input.instruction.programId,
    );

    const preparedTransaction = await this.buildVersionedTransactionBase64({
      network: input.network,
      payer: new PublicKey(input.walletAddress),
      instructions:
        input.instructions && input.instructions.length > 0
          ? input.instructions
          : [
              new TransactionInstruction({
                programId: new PublicKey(input.instruction.programId),
                keys: input.instruction.accounts
                  .filter(
                    (
                      account,
                    ): account is typeof account & { address: string } =>
                      typeof account.address === 'string' &&
                      account.address.length > 0,
                  )
                  .map((account) => ({
                    pubkey: new PublicKey(account.address),
                    isSigner: account.isSigner,
                    isWritable: account.isWritable,
                  })),
                data: Buffer.from(input.instruction.dataBase64, 'base64'),
              }),
            ],
    });

    const session: PreparedAdminExecutionSession = {
      network: input.network,
      action: input.action,
      sessionId: randomUUID(),
      walletAddress: input.walletAddress,
      instructionPayload: input.instruction,
      transactionBase64: preparedTransaction.transactionBase64,
      messageHash: preparedTransaction.messageHash,
      lastValidBlockHeight: preparedTransaction.lastValidBlockHeight,
      expiresAt: new Date(
        Date.now() + ADMIN_STAKING_SESSION_TTL_MS,
      ).toISOString(),
      metadata: input.metadata,
    };

    await this.redisJsonCache.set(
      `staking:admin:prepare:${session.sessionId}`,
      session,
      ADMIN_STAKING_SESSION_TTL_MS,
    );
    return session;
  }

  async executePreparedInstruction(
    dto: ExecuteAdminStakingInstructionDto,
  ): Promise<AdminStakingExecutionPayload> {
    this.assertAdminWalletMatches(dto.walletAddress);
    const session = await this.loadPreparedExecutionSession(dto.sessionId);
    if (session.walletAddress !== dto.walletAddress) {
      throw new BadRequestException(
        'Prepared staking admin session no longer matches this wallet.',
      );
    }

    const signedTransaction = VersionedTransaction.deserialize(
      Buffer.from(dto.signedTransactionBase64, 'base64'),
    );
    const signedMessageHash = createHash('sha256')
      .update(signedTransaction.message.serialize())
      .digest('hex');
    if (signedMessageHash !== session.messageHash) {
      throw new BadRequestException(
        'Signed admin transaction does not match the prepared instruction.',
      );
    }

    const connection = this.connectionService.getSolanaConnection(
      session.network,
    );
    const signature = await connection.sendRawTransaction(
      Buffer.from(signedTransaction.serialize()),
      {
        skipPreflight: false,
        maxRetries: 3,
      },
    );
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: signedTransaction.message.recentBlockhash,
        lastValidBlockHeight: session.lastValidBlockHeight,
      },
      'confirmed',
    );
    if (confirmation.value.err) {
      throw new BadRequestException(
        typeof confirmation.value.err === 'string'
          ? confirmation.value.err
          : JSON.stringify(confirmation.value.err),
      );
    }

    const explorerUrl = buildSolscanTxUrl(signature, session.network);
    await this.handlePreparedExecutionSuccess({
      session,
      signature,
      explorerUrl,
    });

    return {
      sessionId: session.sessionId,
      network: session.network,
      action: session.action,
      signature,
      explorerUrl,
      confirmedAt: new Date().toISOString(),
      slot: confirmation.context.slot ?? null,
    };
  }

  private async loadPreparedExecutionSession(
    sessionId: string,
  ): Promise<PreparedAdminExecutionSession> {
    const session =
      await this.redisJsonCache.get<PreparedAdminExecutionSession>(
        `staking:admin:prepare:${sessionId}`,
      );
    if (!session) {
      throw new BadRequestException(
        'Prepared staking admin session expired. Prepare again.',
      );
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException(
        'Prepared staking admin session expired. Prepare again.',
      );
    }
    return session;
  }

  private async handlePreparedExecutionSuccess(input: {
    session: PreparedAdminExecutionSession;
    signature: string;
    explorerUrl: string;
  }) {
    if (input.session.metadata?.kind !== 'FUNDING_BATCH') {
      return;
    }
    try {
      await this.stakingMirror.upsertFundingBatchProjection({
        network: input.session.network,
        batchId: input.session.metadata.batchId,
        status: 'EXECUTED',
        inputMintAddress: input.session.metadata.inputMintAddress,
        inputTicker: input.session.metadata.inputTicker,
        plannedRewardRa: input.session.metadata.plannedRewardRa,
        fundedRewardRa: input.session.metadata.plannedRewardRa,
        approvedInputAmountRaw: input.session.metadata.approvedInputAmountRaw,
        transactionSignature: input.signature,
        explorerUrl: input.explorerUrl,
        createdAt: new Date(input.session.metadata.createdAt),
        executedAt: new Date(),
      });

      await this.stakingMirror.appendFundingEvent({
        network: input.session.network,
        eventType: 'BATCH_EXECUTED',
        sourceMode: 'DEVNET_REWARD_COVERAGE',
        walletAddress: input.session.walletAddress,
        stakePositionId: null,
        tokenTicker: input.session.metadata.inputTicker ?? 'RA',
        principalRa: 0,
        rewardRa: input.session.metadata.plannedRewardRa,
        finalRaPayout: input.session.metadata.plannedRewardRa,
        referenceId: input.session.metadata.batchId,
        message: input.signature,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown funding mirror error';
      this.logger.warn(`Funding batch mirror write failed: ${message}`);
    }
  }

  private async buildVersionedTransactionBase64(input: {
    network: RuntimeNetwork;
    payer: PublicKey;
    instructions: TransactionInstruction[];
  }) {
    const latestBlockhash = await this.connectionService
      .getSolanaConnection(input.network)
      .getLatestBlockhash('confirmed');
    const message = new TransactionMessage({
      payerKey: input.payer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: input.instructions,
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    const transactionBase64 = Buffer.from(transaction.serialize()).toString(
      'base64',
    );
    return {
      transactionBase64,
      messageHash: createHash('sha256')
        .update(transaction.message.serialize())
        .digest('hex'),
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    };
  }
}
