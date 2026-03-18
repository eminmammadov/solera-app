import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateMarketLivePricingSettingsDto {
  @IsBoolean()
  @IsOptional()
  livePriceEnabled?: boolean;

  @IsInt()
  @Min(5_000)
  @Max(300_000)
  @IsOptional()
  cacheTtlMs?: number;

  @IsInt()
  @Min(1_000)
  @Max(15_000)
  @IsOptional()
  requestTimeoutMs?: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxParallelRequests?: number;
}
