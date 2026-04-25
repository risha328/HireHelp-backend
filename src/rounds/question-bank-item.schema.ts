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
  HR = 'hr',
}

export enum QuestionBankType {
  MCQ = 'mcq',
  VIDEO = 'video',
  FREE_TEXT = 'free_text',
}

export type QuestionBankItemDocument = QuestionBankItem & Document;

@Schema({ timestamps: true })
export class QuestionBankItem {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  questionText: string;

  @Prop({ enum: QuestionBankType, default: QuestionBankType.MCQ })
  questionType: QuestionBankType;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ default: 0, min: 0 })
  correctAnswer: number;

  @Prop({ enum: QuestionDifficulty, required: true })
  difficulty: QuestionDifficulty;

  @Prop({ enum: QuestionCategory, required: true })
  category: QuestionCategory;

  @Prop({ type: [String], default: [] })
  tags: string[];

  /** Suggested time for this question (e.g. in interviews); MCQ rounds may still use round-level duration. */
  @Prop({ min: 1, max: 480 })
  durationMinutes?: number;

  @Prop({ default: true })
  autoSubmit: boolean;

  @Prop({ default: false })
  randomizeOptions: boolean;
}

export const QuestionBankItemSchema = SchemaFactory.createForClass(QuestionBankItem);
