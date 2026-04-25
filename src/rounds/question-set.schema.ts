import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionSetDocument = QuestionSet & Document;

@Schema({ timestamps: true })
export class QuestionSet {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'QuestionBankItem' }], default: [] })
  questionIds: Types.ObjectId[];

  @Prop({ type: Object })
  difficultyDistribution?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };

  @Prop({ type: String, enum: ['easy', 'medium', 'hard'] })
  difficulty?: 'easy' | 'medium' | 'hard';
}

export const QuestionSetSchema = SchemaFactory.createForClass(QuestionSet);
