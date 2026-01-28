import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class VisitorDocument extends Document {
  @Prop({ required: true, index: true })
  visitorId: string; // fingerprint 또는 생성된 고유 ID

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: 1 })
  visitCount: number;

  @Prop()
  lastVisitAt: Date;

  @Prop()
  firstVisitAt: Date;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export const VisitorSchema = SchemaFactory.createForClass(VisitorDocument);
