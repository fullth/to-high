import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserDocument extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  name: string;

  @Prop()
  picture: string;

  @Prop()
  googleId: string;

  @Prop()
  kakaoId: string;

  @Prop({
    type: {
      preferredTone: String,
      preferComfortOnly: Boolean,
      triggers: [String],
    },
    default: {},
  })
  preferences: {
    preferredTone?: string;
    preferComfortOnly?: boolean;
    triggers?: string[];
  };

  // 구독 정보 (토스페이먼츠)
  @Prop()
  billingKey: string; // 토스페이먼츠 빌링키

  @Prop({ default: false })
  isSubscribed: boolean; // 구독 중 여부

  @Prop()
  subscriptionTier: string; // 구독 티어 (basic, premium 등)

  @Prop()
  subscriptionStartDate: Date; // 구독 시작일

  @Prop()
  subscriptionEndDate: Date; // 구독 만료일 (다음 결제일)

  @Prop()
  lastPaymentDate: Date; // 마지막 결제일

  @Prop()
  lastPaymentAmount: number; // 마지막 결제 금액

  // 레거시 사용자 (기존 3개 이상 사용자, 제한 면제)
  @Prop({ default: false })
  isGrandfathered: boolean;

  // timestamps (자동 생성)
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
