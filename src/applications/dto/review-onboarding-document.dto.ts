import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewOnboardingDocumentDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectedReason?: string;
}
