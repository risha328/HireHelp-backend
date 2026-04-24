import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { QuestionCategory, QuestionDifficulty } from '../question-bank-item.schema';

export class CreateQuestionBankItemDto {
  @IsString()
  @MaxLength(2000)
  questionText: string;

  @IsArray()
  options: string[];

  @IsInt()
  @Min(0)
  correctAnswer: number;

  @IsEnum(QuestionDifficulty)
  difficulty: QuestionDifficulty;

  @IsEnum(QuestionCategory)
  category: QuestionCategory;

  @IsOptional()
  @IsArray()
  tags?: string[];
}
