import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class VerifyWalletDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  @Matches(/^[1-9A-HJ-NP-Za-km-z]+$/)
  signature: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  message: string;
}
