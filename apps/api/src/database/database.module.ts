import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionDocument, SessionSchema } from './session.schema';
import { UserDocument, UserSchema } from './user.schema';
import { UserProfileDocument, UserProfileSchema } from './user-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
      { name: SessionDocument.name, schema: SessionSchema },
      { name: UserProfileDocument.name, schema: UserProfileSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
