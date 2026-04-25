import { IsArray, IsMongoId, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateQuestionSetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  questionIds?: string[];

  @IsOptional()
  @IsObject()
  difficultyDistribution?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };

  @IsOptional()
  @IsString()
  difficulty?: 'easy' | 'medium' | 'hard';
}
