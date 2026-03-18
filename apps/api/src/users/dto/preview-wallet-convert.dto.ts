import { IsString, Matches } from 'class-validator';

const BASE58_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class PreviewWalletConvertDto {
  @IsString()
  @Matches(BASE58_ADDRESS_PATTERN)
  walletAddress: string;
}
