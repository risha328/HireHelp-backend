import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobDocument = Job & Document;

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  location: string;

  @Prop()
  salary?: string;

  @Prop({ default: 'full-time' })
  jobType: string;

  @Prop({ default: 'entry' })
  experienceLevel: string;

  @Prop([String])
  skills?: string[];

  @Prop()
  applicationDeadline?: Date;

  @Prop({ default: 'active' })
  status: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);
