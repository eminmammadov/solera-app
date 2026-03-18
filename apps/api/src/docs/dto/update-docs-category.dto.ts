import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DOCS_ICON_VALUES } from './create-docs-category.dto';

export class UpdateDocsCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsIn(DOCS_ICON_VALUES)
  icon?: (typeof DOCS_ICON_VALUES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
