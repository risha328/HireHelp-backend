import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OnboardingDocumentDocument = OnboardingDocument & Document;

export enum OnboardingDocumentType {
  GOVERNMENT_ID = 'GOVERNMENT_ID',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
  ACADEMIC_CERTIFICATES = 'ACADEMIC_CERTIFICATES',
  RESUME = 'RESUME',
  PHOTO = 'PHOTO',
}

export enum OnboardingDocumentStatus {
  NOT_UPLOADED = 'NOT_UPLOADED',
  UPLOADED = 'UPLOADED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class OnboardingDocument {
  @Prop({ type: Types.ObjectId, ref: 'Application', required: true })
  applicationId: Types.ObjectId;

  @Prop({ required: true, enum: OnboardingDocumentType })
  documentType: OnboardingDocumentType;

  @Prop({ default: OnboardingDocumentStatus.NOT_UPLOADED, enum: OnboardingDocumentStatus })
  status: OnboardingDocumentStatus;

  @Prop()
  fileUrl?: string;

  @Prop()
  rejectedReason?: string;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  uploadedAt?: Date;
}

export const OnboardingDocumentSchema = SchemaFactory.createForClass(OnboardingDocument);
OnboardingDocumentSchema.index({ applicationId: 1 });
