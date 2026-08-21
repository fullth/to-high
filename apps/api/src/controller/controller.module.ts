import { Module } from '@nestjs/common';
import { AuthModule } from '../app/auth/auth.module';
import { ChatModule } from '../app/chat/chat.module';
import { AdminModule } from '../app/admin/admin.module';
import { PaymentModule } from '../app/payment/payment.module';
import { InquiryModule } from '../app/inquiry/inquiry.module';
import { AuthController } from './auth/auth.controller';
import { ChatController } from './chat/chat.controller';
import { HealthController } from './health/health.controller';
import { AdminController } from './admin/admin.controller';
import { PaymentController } from './payment/payment.controller';
import { InquiryController } from './inquiry/inquiry.controller';
import { isServiceEnabled } from '../common/service-visibility';

const paymentServiceEnabled = isServiceEnabled('ENABLE_PAYMENT_SERVICE');

@Module({
  imports: [
    AuthModule,
    ChatModule,
    AdminModule,
    InquiryModule,
    ...(paymentServiceEnabled ? [PaymentModule] : []),
  ],
  controllers: [
    AuthController,
    ChatController,
    HealthController,
    AdminController,
    InquiryController,
    ...(paymentServiceEnabled ? [PaymentController] : []),
  ],
})
export class ControllerModule {}
