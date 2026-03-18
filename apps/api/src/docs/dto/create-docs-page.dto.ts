import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class DocsSectionInputDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(SLUG_REGEX)
  anchor?: string;

  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(4000, { each: true })
  content: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateDocsPageDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsString()
  @MaxLength(120)
  @Matches(SLUG_REGEX)
  slug: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => DocsSectionInputDto)
  sections?: DocsSectionInputDto[];
}
