import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateNewsItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  source: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(6)
  @IsOptional()
  tags?: string[];

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  body?: string;

  @IsUrl(
    { require_protocol: true },
    { message: 'articleUrl must be a valid URL with protocol (https://...)' },
  )
  @IsOptional()
  articleUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
