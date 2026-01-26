import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SessionDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserDocument', required: true })
  userId: Types.ObjectId;

  // 최근 대화 (원문 유지, 최대 10턴)
  @Prop({ type: [String], default: [] })
  context: string[];

  // 롤링 요약 (오래된 대화 요약본)
  @Prop({ default: '' })
  rollingSummary: string;

  // 전체 대화 보존 (삭제하지 않음)
  @Prop({ type: [String], default: [] })
  fullContext: string[];

  @Prop({ enum: ['active', 'completed'], default: 'active' })
  status: string;

  @Prop()
  summary: string;

  @Prop()
  category: string;

  @Prop({
    enum: ['T', 'F', 'reaction', 'listening'],
  })
  counselorType: string;

  @Prop({
    enum: ['comfort', 'organize', 'validate', 'direction', 'listen', 'similar'],
  })
  responseMode: string;

  // 대화 턴 수
  @Prop({ default: 0 })
  turnCount: number;

  // 저장 관련 필드
  @Prop({ default: false })
  isSaved: boolean;

  @Prop()
  savedName: string;

  @Prop()
  savedAt: Date;

  // 사용자 지정 별칭
  @Prop()
  alias: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(SessionDocument);
