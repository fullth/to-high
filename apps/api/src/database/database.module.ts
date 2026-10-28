import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionDocument, SessionSchema } from './session.schema';
import { UserDocument, UserSchema } from './user.schema';
import { UserProfileDocument, UserProfileSchema } from './user-profile.schema';
import { VisitorDocument, VisitorSchema } from './visitor.schema';
import { InquiryDocument, InquirySchema } from './inquiry.schema';
import {
  AuthSessionDocument,
  AuthSessionSchema,
} from './auth-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
      { name: SessionDocument.name, schema: SessionSchema },
      { name: UserProfileDocument.name, schema: UserProfileSchema },
      { name: VisitorDocument.name, schema: VisitorSchema },
      { name: InquiryDocument.name, schema: InquirySchema },
      { name: AuthSessionDocument.name, schema: AuthSessionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
