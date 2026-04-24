import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionBankItemDto } from './create-question-bank-item.dto';

export class UpdateQuestionBankItemDto extends PartialType(CreateQuestionBankItemDto) {}
