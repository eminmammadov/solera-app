import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateOhlcAdminConfigDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5000)
  @Max(300000)
  pollIntervalMs?: number;

  @IsOptional()
  @IsBoolean()
  ingestEnabled?: boolean;
}
