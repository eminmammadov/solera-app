import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class StartUserSessionDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9:_-]+$/)
  sessionKey?: string;
}
