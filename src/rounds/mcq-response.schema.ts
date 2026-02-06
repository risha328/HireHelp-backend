import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MCQResponseDocument = MCQResponse & Document;

@Schema({ timestamps: true })
export class MCQResponse {
  @Prop({ type: Types.ObjectId, ref: 'Round', required: true })
  roundId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Application', required: true })
  applicationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  candidateId: Types.ObjectId;

  @Prop({ type: [Number], required: true })
  answers: number[]; // Array of selected option indices for each question

  @Prop({ type: [Boolean] })
  isCorrect?: boolean[]; // Whether each answer is correct

  @Prop({ min: 0, max: 100 })
  score?: number; // Total score percentage

  @Prop({ default: false })
  isSubmitted: boolean;

  @Prop({ type: Date })
  submittedAt?: Date;
}

export const MCQResponseSchema = SchemaFactory.createForClass(MCQResponse);
