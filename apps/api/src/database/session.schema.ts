import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SessionDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserDocument', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  context: string[];

  @Prop({ enum: ['active', 'completed'], default: 'active' })
  status: string;

  @Prop()
  summary: string;

  @Prop()
  category: string;

  @Prop({ enum: ['comfort', 'organize', 'validate', 'direction'] })
  responseMode: string;
}

export const SessionSchema = SchemaFactory.createForClass(SessionDocument);
