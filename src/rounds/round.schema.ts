import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum RoundType {
  INTERVIEW = 'interview',
  MCQ = 'mcq',
  CODING = 'coding',
  CASE_STUDY = 'case_study',
  GROUP_DISCUSSION = 'group_discussion',
}

@Schema()
export class MCQQuestion {
  @Prop({ required: true })
  question: string;

  @Prop([String])
  options: string[];

  @Prop({ required: true })
  correctAnswer: number; // index of correct option
}

export type RoundDocument = Round & Document;

@Schema({ timestamps: true })
export class Round {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  jobId: Types.ObjectId;

  @Prop({ default: 0 })
  order: number;

  @Prop({ enum: RoundType, default: RoundType.INTERVIEW })
  type: RoundType;

  @Prop()
  googleFormLink?: string;

  @Prop()
  googleSheetLink?: string;

  @Prop({ type: [MCQQuestion] })
  mcqQuestions?: MCQQuestion[];

  @Prop({ default: false })
  isArchived: boolean;
}

export const RoundSchema = SchemaFactory.createForClass(Round);
