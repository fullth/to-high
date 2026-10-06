import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type { CounselorType } from '../types/session';

export type MemoryKind = 'style' | 'topic' | 'helpfulApproach';
@Schema()
export class ApprovedMemory {
  _id: Types.ObjectId;
  @Prop({
    type: String,
    required: true,
    enum: ['style', 'topic', 'helpfulApproach'],
  })
  kind: MemoryKind;
  @Prop({ required: true, maxlength: 200 })
  text: string;
  @Prop({ required: true })
  approvedAt: Date;
  @Prop({ required: true, enum: ['userConfirmed'], default: 'userConfirmed' })
  source: string;
}
const ApprovedMemorySchema = SchemaFactory.createForClass(ApprovedMemory);
@Schema({ timestamps: true })
export class CharacterDocument extends Document {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  ownerId: Types.ObjectId;
  @Prop({ required: true, maxlength: 40 })
  displayName: string;
  @Prop({
    type: String,
    required: true,
    enum: ['T', 'F', 'reaction', 'listening'],
  })
  style: CounselorType;
  @Prop({ type: [ApprovedMemorySchema], default: [] })
  memories: ApprovedMemory[];
  @Prop({ default: 0 })
  memoryChars: number;
  @Prop({ default: 0 })
  revision: number;
}
export const CharacterSchema = SchemaFactory.createForClass(CharacterDocument);
