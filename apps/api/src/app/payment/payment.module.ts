import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { PaymentDocument, PaymentSchema } from '../../database/payment.schema';
import { UserDocument, UserSchema } from '../../database/user.schema';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { UserRepository } from '../../persistence/user/user.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentDocument.name, schema: PaymentSchema },
      { name: UserDocument.name, schema: UserSchema },
    ]),
    HttpModule,
  ],
  providers: [PaymentService, PaymentRepository, UserRepository],
  exports: [PaymentService, PaymentRepository],
})
export class PaymentModule {}
