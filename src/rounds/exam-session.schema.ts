import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ExamSessionStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  TIMEOUT_SUBMITTED = 'timeout_submitted',
}

export type ExamSessionDocument = ExamSession & Document;

@Schema({ timestamps: true })
export class ExamSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  candidateId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Application', required: true, index: true })
  applicationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Round', required: true, index: true })
  roundId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], default: [] })
  questionOrder: Types.ObjectId[];

  @Prop({ type: [Number], default: [] })
  answers: number[];

  @Prop({ type: Date, required: true })
  startTime: Date;

  @Prop({ type: Date, required: true })
  endTime: Date;

  @Prop({ enum: ExamSessionStatus, default: ExamSessionStatus.IN_PROGRESS })
  status: ExamSessionStatus;

  @Prop({ min: 0, max: 100 })
  score?: number;

  @Prop()
  correctAnswersCount?: number;

  @Prop()
  totalQuestions?: number;

  @Prop({ type: Date })
  submittedAt?: Date;
}

export const ExamSessionSchema = SchemaFactory.createForClass(ExamSession);
