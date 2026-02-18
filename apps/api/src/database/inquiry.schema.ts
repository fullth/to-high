import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InquiryType = 'contact' | 'feature' | 'ad';

@Schema({ timestamps: true })
export class InquiryMessage {
  @Prop({ required: true, enum: ['user', 'admin'] })
  role: 'user' | 'admin';

  @Prop({ required: true })
  content: string;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export const InquiryMessageSchema = SchemaFactory.createForClass(InquiryMessage);

@Schema({ timestamps: true })
export class InquiryDocument extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ['contact', 'feature', 'ad'] })
  type: InquiryType;

  @Prop({ type: [InquiryMessageSchema], default: [] })
  messages: InquiryMessage[];

  @Prop({ default: 'open', enum: ['open', 'closed'] })
  status: 'open' | 'closed';

  createdAt: Date;
  updatedAt: Date;
}

export const InquirySchema = SchemaFactory.createForClass(InquiryDocument);
