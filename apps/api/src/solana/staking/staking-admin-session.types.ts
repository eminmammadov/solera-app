import type { PreparedAdminStakingExecution } from './staking.types';

export interface FundingBatchExecutionMetadata {
  kind: 'FUNDING_BATCH';
  batchId: string;
  inputMintAddress: string;
  inputTicker: string | null;
  plannedRewardRa: number;
  approvedInputAmountRaw: string;
  createdAt: string;
}

export type PreparedAdminExecutionSession = PreparedAdminStakingExecution & {
  metadata?: FundingBatchExecutionMetadata;
};
