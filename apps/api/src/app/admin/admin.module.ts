import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserDocument, UserSchema } from '../../database/user.schema';
import {
  SessionDocument,
  SessionSchema,
} from '../../database/session.schema';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
      { name: SessionDocument.name, schema: SessionSchema },
    ]),
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
