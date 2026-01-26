import { IsString, IsOptional, IsArray, IsDateString, IsIn } from 'class-validator';

export class CreateJobDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  companyId: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsIn(['full-time', 'part-time', 'contract', 'internship'])
  jobType?: string;

  @IsOptional()
  @IsIn(['entry', 'mid', 'senior', 'executive'])
  experienceLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'closed'])
  status?: string;
}
