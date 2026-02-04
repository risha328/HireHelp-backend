import { IsString, IsOptional, IsNumber, IsMongoId } from 'class-validator';

export class CreateRoundDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMongoId()
  jobId: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}
