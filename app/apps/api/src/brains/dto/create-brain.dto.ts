import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBrainDto {
  @IsString()
  @MinLength(1, { message: 'Name must be at least 1 character' })
  @MaxLength(120)
  name: string;
}
