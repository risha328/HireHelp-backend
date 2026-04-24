import { IsMongoId } from 'class-validator';

export class SubmitExamDto {
  @IsMongoId()
  applicationId: string;
}
