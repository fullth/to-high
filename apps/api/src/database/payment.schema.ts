import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionTier = 'basic' | 'premium';

export const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 2900,
    sessionLimit: 3,
    description: '월 3개 공책 추가',
  },
  premium: {
    name: 'Premium',
    price: 8900,
    sessionLimit: 10,
    description: '월 10개 공책 추가',
  },
} as const;

@Schema({ timestamps: true })
export class PaymentDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'UserDocument', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  orderId: string; // 주문 ID (우리가 생성)

  @Prop({ required: true })
  paymentKey: string; // 토스페이먼츠 결제 키

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['basic', 'premium'] })
  tier: SubscriptionTier;

  @Prop({ required: true, enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'] })
  status: string;

  @Prop()
  method: string; // 결제 수단 (카드, 간편결제 등)

  @Prop()
  cardNumber: string; // 마스킹된 카드번호

  @Prop()
  cardCompany: string; // 카드사

  @Prop()
  receiptUrl: string; // 영수증 URL

  @Prop()
  failReason: string; // 실패 사유

  @Prop()
  cancelReason: string; // 취소 사유

  @Prop()
  cancelledAt: Date;

  // 정기결제용
  @Prop()
  billingKey: string;

  @Prop({ default: false })
  isRecurring: boolean; // 정기결제 여부

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(PaymentDocument);

// 인덱스
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ orderId: 1 }, { unique: true });
PaymentSchema.index({ paymentKey: 1 });
