import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  walletAddress: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  customRoleName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
