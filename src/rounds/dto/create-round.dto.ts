import { IsString, IsOptional, IsNumber, IsMongoId, IsEnum, IsUrl, IsArray, ValidateIf } from 'class-validator';
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
  @ValidateIf((o) => o.googleFormLink && o.googleFormLink !== '')
  @IsUrl()
  googleFormLink?: string;

  @IsOptional()
  @ValidateIf((o) => o.googleSheetLink && o.googleSheetLink !== '')
  @IsUrl()
  googleSheetLink?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MCQQuestion)
  mcqQuestions?: MCQQuestion[];

  @IsOptional()
  @IsString()
  @IsEnum(['online', 'offline'])
  interviewMode?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['one-to-one', 'panel'])
  interviewType?: string;

  @IsOptional()
  scheduledAt?: Date;

  @IsOptional()
  @IsArray()
  interviewers?: { name: string; email: string }[];

  @IsOptional()
  @IsString()
  meetingLink?: string;
}
