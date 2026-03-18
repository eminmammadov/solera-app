import { IsOptional, IsString } from 'class-validator';

export class UpdateProxyBackendDraftDto {
  @IsOptional()
  @IsString()
  backendBaseUrl?: string | null;
}
