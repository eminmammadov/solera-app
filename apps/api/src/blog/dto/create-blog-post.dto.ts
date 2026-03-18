import {
  ArrayMaxSize,
  ArrayMinSize,
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 180)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must use lowercase letters, numbers, and hyphens only (example: sample-post-title).',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 600)
  summary: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @MaxLength(12000, { each: true })
  content: string[];

  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  category: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  author: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 40)
  readTime: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @Matches(/^(https?:\/\/|\/).+/, {
    message: 'imageUrl must be an absolute URL or a root-relative path.',
  })
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsDateString()
  @IsOptional()
  publishedAt?: string;
}
