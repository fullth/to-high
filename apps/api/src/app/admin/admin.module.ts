import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserDocument, UserSchema } from '../../database/user.schema';
import {
  SessionDocument,
  SessionSchema,
} from '../../database/session.schema';
import { VisitorDocument, VisitorSchema } from '../../database/visitor.schema';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
      { name: SessionDocument.name, schema: SessionSchema },
      { name: VisitorDocument.name, schema: VisitorSchema },
    ]),
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
