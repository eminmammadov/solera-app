import { IsString, Matches, MaxLength } from 'class-validator';

export class ExecuteWalletStakeDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsString()
  @MaxLength(64)
  sessionId: string;

  @IsString()
  signedTransactionBase64: string;
}
