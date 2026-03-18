import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUserStakePositionDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsString()
  @MaxLength(16)
  tokenTicker: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tokenName?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.00000001)
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountUsd?: number;

  @IsString()
  @MaxLength(16)
  periodLabel: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  periodDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  apy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rewardEstimate?: number;

  @IsString()
  @MaxLength(64)
  prepareSessionId: string;

  @IsString()
  signedTransactionBase64: string;

  @IsString()
  @MaxLength(128)
  executionSignature: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  executionExplorerUrl?: string;
}
