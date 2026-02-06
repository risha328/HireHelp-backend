import { IsArray, IsMongoId, IsNumber, ArrayMinSize } from 'class-validator';

export class SubmitMcqDto {
  @IsMongoId()
  applicationId: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  answers: number[]; // Array of selected option indices
}
