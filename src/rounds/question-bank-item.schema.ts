import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum QuestionCategory {
  TECHNICAL = 'technical',
  APTITUDE = 'aptitude',
}

export type QuestionBankItemDocument = QuestionBankItem & Document;

@Schema({ timestamps: true })
export class QuestionBankItem {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  questionText: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ required: true, min: 0 })
  correctAnswer: number;

  @Prop({ enum: QuestionDifficulty, required: true })
  difficulty: QuestionDifficulty;

  @Prop({ enum: QuestionCategory, required: true })
  category: QuestionCategory;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const QuestionBankItemSchema = SchemaFactory.createForClass(QuestionBankItem);
