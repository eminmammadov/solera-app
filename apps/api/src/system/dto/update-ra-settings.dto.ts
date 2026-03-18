import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const BASE58_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class UpdateRaSettingsDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  tokenSymbol?: string;

  @IsOptional()
  @IsString()
  tokenName?: string;

  @IsOptional()
  @IsString()
  @Matches(BASE58_ADDRESS_PATTERN)
  mintDevnet?: string;

  @IsOptional()
  @IsString()
  @Matches(BASE58_ADDRESS_PATTERN)
  mintMainnet?: string;

  @IsOptional()
  @IsString()
  @Matches(BASE58_ADDRESS_PATTERN)
  treasuryDevnet?: string;

  @IsOptional()
  @IsString()
  @Matches(BASE58_ADDRESS_PATTERN)
  treasuryMainnet?: string;

  @IsOptional()
  @IsString()
  @IsIn(['DEXSCREENER', 'RAYDIUM'])
  oraclePrimary?: 'DEXSCREENER' | 'RAYDIUM';

  @IsOptional()
  @IsString()
  @IsIn(['DEXSCREENER', 'RAYDIUM'])
  oracleSecondary?: 'DEXSCREENER' | 'RAYDIUM' | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10_000)
  stakeFeeBps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10_000)
  claimFeeBps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stakeMinUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stakeMaxUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  convertMinUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  convertMaxUsd?: number;

  @IsOptional()
  @IsBoolean()
  convertEnabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['RAYDIUM', 'JUPITER'])
  convertProvider?: 'RAYDIUM' | 'JUPITER';

  @IsOptional()
  @IsString()
  @IsIn(['AUTO', 'SINGLE_TX_ONLY', 'ALLOW_MULTI_TX'])
  convertExecutionMode?: 'AUTO' | 'SINGLE_TX_ONLY' | 'ALLOW_MULTI_TX';

  @IsOptional()
  @IsString()
  @IsIn(['TOKEN_TO_SOL_TO_RA'])
  convertRoutePolicy?: 'TOKEN_TO_SOL_TO_RA';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10_000)
  convertSlippageBps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  convertMaxTokensPerSession?: number;

  @IsOptional()
  @IsString()
  @Matches(BASE58_ADDRESS_PATTERN)
  convertPoolIdDevnet?: string;

  @IsOptional()
  @IsString()
  @Matches(BASE58_ADDRESS_PATTERN)
  convertPoolIdMainnet?: string;

  @IsOptional()
  @IsString()
  @Matches(BASE58_ADDRESS_PATTERN)
  convertQuoteMintDevnet?: string;

  @IsOptional()
  @IsString()
  @Matches(BASE58_ADDRESS_PATTERN)
  convertQuoteMintMainnet?: string;
}
