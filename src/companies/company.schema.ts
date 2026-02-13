import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  logoUrl?: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop()
  industry?: string;

  @Prop()
  size?: string;

  @Prop()
  website?: string;

  @Prop()
  location?: string;

  @Prop()
  contactEmail?: string;

  @Prop()
  contactPhone?: string;

  @Prop({ default: 'pending' })
  verificationStatus: string; // 'pending', 'verified', 'rejected'
}

export const CompanySchema = SchemaFactory.createForClass(Company);
