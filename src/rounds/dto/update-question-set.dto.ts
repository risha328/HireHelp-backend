import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionSetDto } from './create-question-set.dto';

export class UpdateQuestionSetDto extends PartialType(CreateQuestionSetDto) {}
