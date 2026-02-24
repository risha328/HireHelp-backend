import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApplicationDocument = Application & Document;

export enum ApplicationStatus {
  APPLIED = 'APPLIED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  HOLD = 'HOLD',
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

  @Prop({ type: Types.ObjectId, ref: 'Round' })
  currentRound?: Types.ObjectId;

  /** Offer letter PDF URL (Cloudinary) after send */
  @Prop()
  offerLetterUrl?: string;

  @Prop()
  offerSentAt?: Date;

  /** null = pending, true = accepted, false = declined */
  @Prop({ type: Boolean, default: null })
  offerAccepted?: boolean | null;

  @Prop()
  offerAcceptedAt?: Date;

  @Prop({ type: Object })
  offerDetails?: {
    position?: string;
    salary?: string;
    startDate?: string;
    expiryDate?: string;
    terms?: string;
    companyName?: string;
    jobTitle?: string;
    candidateName?: string;
  };
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
