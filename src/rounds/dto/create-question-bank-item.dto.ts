import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { QuestionBankType, QuestionCategory, QuestionDifficulty } from '../question-bank-item.schema';

export class CreateQuestionBankItemDto {
  @IsString()
  @MaxLength(2000)
  questionText: string;

  @IsOptional()
  @IsEnum(QuestionBankType)
  questionType?: QuestionBankType;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  correctAnswer?: number;

  @IsEnum(QuestionDifficulty)
  difficulty: QuestionDifficulty;

  @IsEnum(QuestionCategory)
  category: QuestionCategory;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  autoSubmit?: boolean;

  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;
}
