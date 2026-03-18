import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateOhlcPairDto {
  @IsString()
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9_:-]{2,80}$/)
  pairKey: string;

  @IsString()
  @MaxLength(64)
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,64}$/)
  poolId: string;

  @IsString()
  @MaxLength(64)
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,64}$/)
  baseMint: string;

  @IsString()
  @MaxLength(64)
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,64}$/)
  quoteMint: string;

  @IsString()
  @MaxLength(16)
  @Matches(/^[A-Za-z0-9]{2,16}$/)
  baseSymbol: string;

  @IsString()
  @MaxLength(16)
  @Matches(/^[A-Za-z0-9]{2,16}$/)
  quoteSymbol: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
