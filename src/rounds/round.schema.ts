import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoundDocument = Round & Document;

@Schema({ timestamps: true })
export class Round {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  jobId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  archivedAt?: Date;
}

export const RoundSchema = SchemaFactory.createForClass(Round);
