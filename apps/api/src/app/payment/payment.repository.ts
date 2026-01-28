import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentDocument, SubscriptionTier } from '../../database/payment.schema';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(PaymentDocument.name)
    private paymentModel: Model<PaymentDocument>,
  ) {}

  async create(data: {
    userId: string;
    orderId: string;
    paymentKey: string;
    amount: number;
    tier: SubscriptionTier;
    status: string;
    method?: string;
    cardNumber?: string;
    cardCompany?: string;
    receiptUrl?: string;
    billingKey?: string;
    isRecurring?: boolean;
  }): Promise<PaymentDocument> {
    return this.paymentModel.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
    });
  }

  async findByOrderId(orderId: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ orderId });
  }

  async findByPaymentKey(paymentKey: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ paymentKey });
  }

  async updateStatus(
    orderId: string,
    status: string,
    additionalData?: Partial<PaymentDocument>,
  ): Promise<PaymentDocument | null> {
    return this.paymentModel.findOneAndUpdate(
      { orderId },
      { status, ...additionalData },
      { new: true },
    );
  }

  async getUserPayments(userId: string, limit = 20): Promise<PaymentDocument[]> {
    return this.paymentModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getLastSuccessfulPayment(userId: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({
      userId: new Types.ObjectId(userId),
      status: 'completed',
    }).sort({ createdAt: -1 });
  }
}
