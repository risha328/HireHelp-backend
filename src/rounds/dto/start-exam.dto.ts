import { IsMongoId } from 'class-validator';

export class StartExamDto {
  @IsMongoId()
  applicationId: string;
}
