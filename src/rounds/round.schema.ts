import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum RoundType {
  INTERVIEW = 'interview',
  MCQ = 'mcq',
  CODING = 'coding',
  CASE_STUDY = 'case_study',
  GROUP_DISCUSSION = 'group_discussion',
  TECHNICAL = 'technical',
  HR = 'hr',
}
// Schema for Round entity
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

  @Prop()
  platform?: string; // For Coding Test

  @Prop()
  duration?: string; // e.g. "60 Mins"

  @Prop()
  instructions?: string; // Specific instructions for the round

  @Prop({ type: [MCQQuestion] })
  mcqQuestions?: MCQQuestion[];

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ enum: ['online', 'offline'] })
  interviewMode?: string;

  @Prop({ enum: ['one-to-one', 'panel'] })
  interviewType?: string;

  @Prop()
  scheduledAt?: Date;

  @Prop({ type: [{ name: String, email: String }] })
  interviewers?: { name: string; email: string }[];

  @Prop()
  meetingLink?: string;
}

export const RoundSchema = SchemaFactory.createForClass(Round);
