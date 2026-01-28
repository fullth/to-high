import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PaymentRepository } from './payment.repository';
import { UserRepository } from '../../persistence/user/user.repository';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '../../database/payment.schema';

@Injectable()
export class PaymentService {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.tosspayments.com/v1';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private paymentRepository: PaymentRepository,
    private userRepository: UserRepository,
  ) {
    this.secretKey = this.configService.get<string>('TOSS_SECRET_KEY') || '';
  }

  private getAuthHeader() {
    const encoded = Buffer.from(`${this.secretKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * 주문 ID 생성
   */
  generateOrderId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `order_${timestamp}_${random}`;
  }

  /**
   * 결제 승인 (클라이언트에서 결제 완료 후 호출)
   */
  async confirmPayment(
    userId: string,
    paymentKey: string,
    orderId: string,
    amount: number,
    tier: SubscriptionTier,
  ) {
    // 금액 검증
    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan || plan.price !== amount) {
      throw new BadRequestException('잘못된 결제 금액입니다.');
    }

    try {
      // 토스페이먼츠 결제 승인 API 호출
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/payments/confirm`,
          { paymentKey, orderId, amount },
          {
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const paymentData = response.data as any;

      // 결제 내역 저장
      const payment = await this.paymentRepository.create({
        userId,
        orderId,
        paymentKey,
        amount,
        tier,
        status: 'completed',
        method: paymentData.method,
        cardNumber: paymentData.card?.number,
        cardCompany: paymentData.card?.company,
        receiptUrl: paymentData.receipt?.url,
      });

      // 사용자 구독 상태 업데이트
      await this.activateSubscription(userId, tier);

      return {
        success: true,
        payment: {
          orderId: payment.orderId,
          amount: payment.amount,
          tier: payment.tier,
          status: payment.status,
          receiptUrl: payment.receiptUrl,
        },
      };
    } catch (error: any) {
      // 결제 실패 기록
      await this.paymentRepository.create({
        userId,
        orderId,
        paymentKey,
        amount,
        tier,
        status: 'failed',
      });

      const errorMessage = error.response?.data?.message || '결제 처리 중 오류가 발생했습니다.';
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * 구독 활성화
   */
  async activateSubscription(userId: string, tier: SubscriptionTier) {
    const plan = SUBSCRIPTION_PLANS[tier];
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1); // 1개월 후

    await this.userRepository.updateSubscription(userId, {
      isSubscribed: true,
      subscriptionTier: tier,
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      lastPaymentDate: now,
      lastPaymentAmount: plan.price,
    });
  }

  /**
   * 구독 취소
   */
  async cancelSubscription(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isSubscribed) {
      throw new BadRequestException('활성화된 구독이 없습니다.');
    }

    // 구독 종료일까지는 유지, 갱신만 중단
    await this.userRepository.updateSubscription(userId, {
      isSubscribed: false,
    });

    return { success: true, message: '구독이 취소되었습니다. 남은 기간은 계속 이용 가능합니다.' };
  }

  /**
   * 결제 취소/환불
   */
  async cancelPayment(userId: string, paymentKey: string, cancelReason: string) {
    const payment = await this.paymentRepository.findByPaymentKey(paymentKey);
    if (!payment) {
      throw new NotFoundException('결제 내역을 찾을 수 없습니다.');
    }

    if (payment.userId.toString() !== userId) {
      throw new BadRequestException('권한이 없습니다.');
    }

    if (payment.status !== 'completed') {
      throw new BadRequestException('취소할 수 없는 결제입니다.');
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/payments/${paymentKey}/cancel`,
          { cancelReason },
          {
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      await this.paymentRepository.updateStatus(payment.orderId, 'refunded', {
        cancelReason,
        cancelledAt: new Date(),
      });

      // 구독 취소
      await this.userRepository.updateSubscription(userId, {
        isSubscribed: false,
        subscriptionEndDate: new Date(),
      });

      return { success: true, message: '환불이 완료되었습니다.' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '환불 처리 중 오류가 발생했습니다.';
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * 사용자 결제 내역 조회
   */
  async getPaymentHistory(userId: string) {
    const payments = await this.paymentRepository.getUserPayments(userId);
    return payments.map((p) => ({
      orderId: p.orderId,
      amount: p.amount,
      tier: p.tier,
      status: p.status,
      method: p.method,
      cardCompany: p.cardCompany,
      cardNumber: p.cardNumber,
      receiptUrl: p.receiptUrl,
      createdAt: p.createdAt,
    }));
  }

  /**
   * 구독 정보 조회
   */
  async getSubscriptionInfo(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const plan = user.subscriptionTier ? SUBSCRIPTION_PLANS[user.subscriptionTier as SubscriptionTier] : null;

    return {
      isSubscribed: user.isSubscribed,
      tier: user.subscriptionTier,
      plan: plan ? {
        name: plan.name,
        price: plan.price,
        sessionLimit: plan.sessionLimit,
        description: plan.description,
      } : null,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      isGrandfathered: user.isGrandfathered,
    };
  }

  /**
   * 요금제 목록 조회
   */
  getPlans() {
    return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      tier: key,
      ...plan,
    }));
  }
}
