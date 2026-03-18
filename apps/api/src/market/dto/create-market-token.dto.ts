import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMarketTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  ticker: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  category: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  chg24h?: number;

  @IsNumber()
  @IsOptional()
  stake7d?: number;

  @IsNumber()
  @IsOptional()
  stake1m?: number;

  @IsNumber()
  @IsOptional()
  stake3m?: number;

  @IsNumber()
  @IsOptional()
  stake6m?: number;

  @IsNumber()
  @IsOptional()
  stake12m?: number;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isImage?: boolean;

  @IsString()
  @IsOptional()
  colorBg?: string;

  @IsString()
  @IsOptional()
  priceColor?: string;

  @IsString()
  @IsOptional()
  priceDecimalColor?: string;

  @IsString()
  @IsOptional()
  mintAddress?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  stakeEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  convertEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  portfolioVisible?: boolean;
}
