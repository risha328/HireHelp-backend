import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateBackgroundVerificationDto {
  @IsIn(['NOT_INITIATED', 'IN_PROGRESS', 'VERIFIED', 'FAILED'])
  status: 'NOT_INITIATED' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  failedReason?: string;
}
