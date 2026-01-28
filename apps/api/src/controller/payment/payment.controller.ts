import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/jwt.guard';
import { PaymentService } from '../../app/payment/payment.service';
import { SubscriptionTier } from '../../database/payment.schema';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get('plans')
  @ApiOperation({
    summary: '요금제 목록 조회',
    description: '이용 가능한 구독 요금제 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '요금제 목록',
  })
  getPlans() {
    return { plans: this.paymentService.getPlans() };
  }

  @Post('order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '주문 생성',
    description: '결제를 위한 주문 ID를 생성합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tier'],
      properties: {
        tier: {
          type: 'string',
          enum: ['basic', 'premium'],
          description: '구독 티어',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '주문 생성 성공',
  })
  createOrder(@Body() dto: { tier: SubscriptionTier }) {
    const orderId = this.paymentService.generateOrderId();
    return { orderId, tier: dto.tier };
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '결제 승인',
    description: '토스페이먼츠 결제를 승인합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentKey', 'orderId', 'amount', 'tier'],
      properties: {
        paymentKey: { type: 'string', description: '토스페이먼츠 결제 키' },
        orderId: { type: 'string', description: '주문 ID' },
        amount: { type: 'number', description: '결제 금액' },
        tier: { type: 'string', enum: ['basic', 'premium'], description: '구독 티어' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '결제 승인 성공',
  })
  async confirmPayment(
    @Req() req: any,
    @Body() dto: {
      paymentKey: string;
      orderId: string;
      amount: number;
      tier: SubscriptionTier;
    },
  ) {
    const userId = req.user.userId;
    return this.paymentService.confirmPayment(
      userId,
      dto.paymentKey,
      dto.orderId,
      dto.amount,
      dto.tier,
    );
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '구독 정보 조회',
    description: '현재 사용자의 구독 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '구독 정보',
  })
  async getSubscription(@Req() req: any) {
    const userId = req.user.userId;
    return this.paymentService.getSubscriptionInfo(userId);
  }

  @Post('cancel-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '구독 취소',
    description: '구독을 취소합니다. 남은 기간은 계속 이용 가능합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '구독 취소 성공',
  })
  async cancelSubscription(@Req() req: any) {
    const userId = req.user.userId;
    return this.paymentService.cancelSubscription(userId);
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '결제 환불',
    description: '결제를 환불합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentKey', 'cancelReason'],
      properties: {
        paymentKey: { type: 'string', description: '결제 키' },
        cancelReason: { type: 'string', description: '환불 사유' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '환불 성공',
  })
  async refundPayment(
    @Req() req: any,
    @Body() dto: { paymentKey: string; cancelReason: string },
  ) {
    const userId = req.user.userId;
    return this.paymentService.cancelPayment(userId, dto.paymentKey, dto.cancelReason);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '결제 내역 조회',
    description: '사용자의 결제 내역을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '결제 내역',
  })
  async getPaymentHistory(@Req() req: any) {
    const userId = req.user.userId;
    const payments = await this.paymentService.getPaymentHistory(userId);
    return { payments };
  }
}
