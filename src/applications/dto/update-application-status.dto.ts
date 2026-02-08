import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApplicationStatus } from '../application.schema';

export class UpdateApplicationStatusDto {
    @IsEnum(ApplicationStatus)
    status: ApplicationStatus;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    currentRound?: string;
}
