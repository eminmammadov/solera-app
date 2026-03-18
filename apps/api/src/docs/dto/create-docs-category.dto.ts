import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const DOCS_ICON_VALUES = ['Rocket', 'Cpu', 'Shield', 'Code'] as const;
export type DocsIconValue = (typeof DOCS_ICON_VALUES)[number];

export class CreateDocsCategoryDto {
  @IsString()
  @MaxLength(80)
  title: string;

  @IsOptional()
  @IsIn(DOCS_ICON_VALUES)
  icon?: DocsIconValue;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
