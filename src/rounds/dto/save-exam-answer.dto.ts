import { IsInt, Min } from 'class-validator';

export class SaveExamAnswerDto {
  @IsInt()
  @Min(0)
  questionIndex: number;

  @IsInt()
  @Min(0)
  answer: number;
}
