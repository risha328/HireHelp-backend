import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsNotEmpty()
  @IsString()
  jobId: string;

  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsString()
  resumeUrl?: string;
}
