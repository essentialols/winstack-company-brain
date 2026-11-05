import { IsOptional, IsString } from 'class-validator';

/** Multipart body: `payload` is a JSON string, `audio` is the file part. */
export class PublishIssueFormDto {
  @IsString()
  payload: string;
}

/** Shape of the parsed `payload` field. */
export interface PublishIssuePayload {
  title: string;
  content: unknown;
  audioDurationSec?: number;
}

export class DueBrainsQueryDto {
  @IsOptional()
  @IsString()
  now?: string;

  @IsOptional()
  @IsString()
  force?: string;
}
