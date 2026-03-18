import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class UpdateDocsSocialLinkDto {
  @IsString()
  @MaxLength(32)
  label: string;

  @IsString()
  @MaxLength(300)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  href: string;
}

export class UpdateDocsSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(24)
  version?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => UpdateDocsSocialLinkDto)
  socialLinks?: UpdateDocsSocialLinkDto[];
}
