import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DigestFrequency } from '@prisma/client';

export class UpdateBrainDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(DigestFrequency)
  frequency?: DigestFrequency;

  /** 0 = Sunday … 6 = Saturday */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  deliveryDays?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  deliveryHour?: number;

  /** IANA zone; validated against Intl in the service. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @IsIn([5, 10, 15])
  podcastMinutes?: number;
}
