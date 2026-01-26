import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  CANDIDATE = 'CANDIDATE',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ required: true, enum: Role })
  role: Role;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ enum: Gender })
  gender?: Gender;

  @Prop()
  phone?: string;

  @Prop()
  title?: string;

  @Prop()
  company?: string;

  @Prop()
  location?: string;

  @Prop()
  website?: string;

  @Prop()
  bio?: string;

  @Prop()
  resumeUrl?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
