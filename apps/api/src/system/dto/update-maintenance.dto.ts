import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateMaintenanceDto {
  @IsOptional()
  @IsBoolean()
  maintenanceEnabled?: boolean;

  @IsOptional()
  @IsISO8601()
  maintenanceStartsAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  maintenanceMessage?: string | null;
}
