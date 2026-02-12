import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum EvaluationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  MISSED = 'missed',
  RESCHEDULING = 'rescheduling',
  RESCHEDULED = 'rescheduled',
}

export type RoundEvaluationDocument = RoundEvaluation & Document;

@Schema({ timestamps: true })
export class RoundEvaluation {
  @Prop({ type: Types.ObjectId, ref: 'Round', required: true })
  roundId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Application', required: true })
  applicationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  evaluatorId: Types.ObjectId;

  @Prop({ enum: EvaluationStatus, default: EvaluationStatus.PENDING })
  status: EvaluationStatus;

  @Prop({ min: 0, max: 100 })
  score?: number;

  @Prop()
  notes?: string;

  @Prop()
  feedback?: string;

  @Prop({ type: Date })
  scheduledAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ default: false })
  isFinal: boolean;

  @Prop({ type: [{ name: String, email: String }] })
  assignedInterviewers?: { name: string; email: string }[];

  @Prop()
  interviewMode?: string;

  @Prop()
  interviewType?: string;

  @Prop()
  platform?: string;

  @Prop()
  meetingLink?: string;

  @Prop()
  duration?: string;

  @Prop({ type: Object })
  locationDetails?: {
    venueName: string;
    address: string;
    city: string;
    landmark: string;
  };
}

export const RoundEvaluationSchema = SchemaFactory.createForClass(RoundEvaluation);
