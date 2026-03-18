import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PrepareWalletConvertTokenDto {
  @IsString()
  @MaxLength(16)
  ticker: string;
}

export class PrepareWalletConvertDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => PrepareWalletConvertTokenDto)
  tokens: PrepareWalletConvertTokenDto[];
}
