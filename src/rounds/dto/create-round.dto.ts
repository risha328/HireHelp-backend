import { IsString, IsOptional, IsNumber, IsMongoId, IsEnum, IsUrl, IsArray, ValidateIf, Min, Max, IsBoolean } from 'class-validator';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RoundType, MCQQuestion, MCQMode } from '../round.schema';

export class LocationDetailsDto {
  @IsString()
  venueName: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  landmark?: string;
}

export class SchedulingDto {
  @IsString()
  interviewDate: string;

  @IsString()
  interviewTime: string;

  @IsOptional()
  @IsString()
  reportingTime?: string;
}

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
  @IsEnum(MCQMode)
  mode?: MCQMode;

  @IsOptional()
  @IsMongoId()
  questionSetId?: string;

  @IsOptional()
  @ValidateIf((o) => o.googleFormLink && o.googleFormLink !== '')
  @IsUrl()
  googleFormLink?: string;

  @IsOptional()
  @ValidateIf((o) => o.externalLink && o.externalLink !== '')
  @IsUrl()
  externalLink?: string;

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
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  autoSubmit?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passPercentage?: number;

  @IsOptional()
  difficultyDistribution?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };

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

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDetailsDto)
  locationDetails?: LocationDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SchedulingDto)
  scheduling?: SchedulingDto;
}
