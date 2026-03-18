import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWalletActivityDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsString()
  @IsIn(['DEPOSIT', 'WITHDRAW', 'CONVERT'])
  type: string;

  @IsString()
  @MaxLength(32)
  tokenTicker: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tokenName?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountUsd?: number;

  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'COMPLETED', 'FAILED'])
  status?: string;
}
