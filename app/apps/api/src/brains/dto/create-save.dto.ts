import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SaveKind } from '@prisma/client';

const MAX_BODY_CHARS = 200_000;

/** Mirrors `CreateSaveInput` in @app-starter/shared. `source` is set by the server. */
export class CreateSaveDto {
  @IsOptional()
  @IsUUID()
  brainId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(SaveKind)
  kind?: SaveKind;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  siteName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_BODY_CHARS)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_BODY_CHARS)
  selection?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_BODY_CHARS * 2)
  captions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
