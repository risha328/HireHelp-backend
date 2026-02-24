import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  @MaxLength(200)
  position: string;

  @ApiProperty({ example: 'INR 12,00,000 - 15,00,000 per annum' })
  @IsString()
  @MaxLength(200)
  salary: string;

  @ApiProperty({ example: '2025-03-01' })
  @IsString()
  @MaxLength(50)
  startDate: string;

  @ApiPropertyOptional({ example: '2025-02-15', description: 'Offer expiry date for acceptance' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'Standard company policies apply. Probation period: 6 months.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  terms?: string;
}

export interface OfferPreviewData {
  position: string;
  salary: string;
  startDate: string;
  expiryDate?: string;
  terms?: string;
  companyName: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
}
