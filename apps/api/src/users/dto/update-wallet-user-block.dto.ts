import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWalletUserBlockDto {
  @IsBoolean()
  isBlocked: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  blockMessage?: string;
}
