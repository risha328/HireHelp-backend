import { IsString, IsOptional, IsNumber, IsMongoId, IsEnum, IsUrl, IsArray } from 'class-validator';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RoundType, MCQQuestion } from '../round.schema';

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

  @IsOptional()
  @IsEnum(RoundType)
  type?: RoundType;

  @IsOptional()
  @IsUrl()
  googleFormLink?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MCQQuestion)
  mcqQuestions?: MCQQuestion[];
}
