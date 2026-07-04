import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';

export class SubmitExamDto {
  @IsMongoId()
  applicationId: string;

  @IsOptional()
  @IsBoolean()
  timeoutSubmit?: boolean;
}
