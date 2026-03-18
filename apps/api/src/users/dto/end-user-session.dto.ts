import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class EndUserSessionDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsString()
  @Matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )
  sessionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  reason?: string;
}
