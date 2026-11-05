import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDigestPreferencesDto {
  @IsOptional()
  @IsBoolean()
  wantsRead?: boolean;

  @IsOptional()
  @IsBoolean()
  wantsListen?: boolean;
}

export interface DigestPreferencesResponse {
  wantsRead: boolean;
  wantsListen: boolean;
}
