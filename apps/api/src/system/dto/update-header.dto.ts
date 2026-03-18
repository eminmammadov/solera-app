import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class UpdateHeaderNavLinkDto {
  @IsString()
  @MaxLength(24)
  name: string;

  @IsString()
  @MaxLength(120)
  href: string;
}

export class UpdateHeaderDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  projectName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  description?: string;

  @IsOptional()
  @IsIn(['devnet', 'mainnet'])
  network?: 'devnet' | 'mainnet';

  @IsOptional()
  @IsBoolean()
  connectEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => UpdateHeaderNavLinkDto)
  navLinks?: UpdateHeaderNavLinkDto[];
}
