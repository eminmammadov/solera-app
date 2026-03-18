import { Type } from 'class-transformer';
import { IsNumber, IsString, Matches, MaxLength, Min } from 'class-validator';

export class PreviewWalletStakeDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsString()
  @MaxLength(16)
  tokenTicker: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.00000001)
  amount: number;

  @IsString()
  @MaxLength(16)
  periodLabel: string;
}
