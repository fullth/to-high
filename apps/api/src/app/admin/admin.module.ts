import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserDocument, UserSchema } from '../../database/user.schema';
import {
  SessionDocument,
  SessionSchema,
} from '../../database/session.schema';
import { VisitorDocument, VisitorSchema } from '../../database/visitor.schema';
import { AdminService } from './admin.service';
import { NotificationService } from '../../common/notification.service';
import { InquiryModule } from '../inquiry/inquiry.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
      { name: SessionDocument.name, schema: SessionSchema },
      { name: VisitorDocument.name, schema: VisitorSchema },
    ]),
    InquiryModule,
  ],
  providers: [AdminService, NotificationService],
  exports: [AdminService],
})
export class AdminModule {}
