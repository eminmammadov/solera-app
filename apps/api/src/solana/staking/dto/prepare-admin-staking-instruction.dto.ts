import { IsOptional, IsString, Matches } from 'class-validator';

export class PrepareAdminStakingInstructionDto {
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @IsOptional()
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  multisigAuthority?: string;
}
