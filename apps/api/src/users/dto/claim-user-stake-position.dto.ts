import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ClaimUserStakePositionDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsString()
  @MaxLength(128)
  executionSignature: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  executionExplorerUrl?: string;
}
