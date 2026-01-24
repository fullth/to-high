import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 감정 패턴 기록
 */
@Schema({ _id: false })
export class EmotionPattern {
  @Prop({ required: true })
  emotion: string; // "불안", "우울", "분노" 등

  @Prop({ default: 1 })
  count: number; // 언급 횟수

  @Prop()
  lastMentioned: Date;
}

/**
 * 주요 이슈/주제
 */
@Schema({ _id: false })
export class CoreIssue {
  @Prop({ required: true })
  topic: string; // "직장 스트레스", "연애 고민" 등

  @Prop({ default: 1 })
  count: number;

  @Prop()
  lastMentioned: Date;

  @Prop()
  summary: string; // 해당 주제에 대한 요약
}

/**
 * 사용자 프로필 - 장기 기억
 */
@Schema({ timestamps: true })
export class UserProfileDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserDocument', required: true, unique: true })
  userId: Types.ObjectId;

  // 선호 상담 스타일
  @Prop({ enum: ['T', 'F', 'deep'], default: 'F' })
  preferredCounselorType: string;

  // 선호 응답 모드
  @Prop({ enum: ['comfort', 'organize', 'validate', 'direction', 'listen', 'similar'] })
  preferredResponseMode: string;

  // 주요 감정 패턴
  @Prop({ type: [EmotionPattern], default: [] })
  emotionPatterns: EmotionPattern[];

  // 핵심 이슈/주제
  @Prop({ type: [CoreIssue], default: [] })
  coreIssues: CoreIssue[];

  // 중요한 컨텍스트 (AI가 기억해야 할 핵심 정보)
  @Prop({ type: [String], default: [] })
  importantContext: string[];

  // 총 상담 횟수
  @Prop({ default: 0 })
  totalSessions: number;

  // 마지막 상담 요약
  @Prop()
  lastSessionSummary: string;

  createdAt: Date;
  updatedAt: Date;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfileDocument);
