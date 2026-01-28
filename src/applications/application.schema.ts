import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApplicationDocument = Application & Document;

export enum ApplicationStatus {
  APPLIED = 'APPLIED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class Application {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  candidateId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  jobId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop()
  coverLetter?: string;

  @Prop()
  resumeUrl?: string;

  @Prop({ default: ApplicationStatus.APPLIED, enum: ApplicationStatus })
  status: ApplicationStatus;

  @Prop()
  notes?: string;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
