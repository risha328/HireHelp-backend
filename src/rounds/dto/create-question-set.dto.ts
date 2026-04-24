import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateQuestionSetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  questionIds?: string[];

  @IsOptional()
  difficultyDistribution?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };
}
