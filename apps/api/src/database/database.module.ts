import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionDocument, SessionSchema } from './session.schema';
import { UserDocument, UserSchema } from './user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
      { name: SessionDocument.name, schema: SessionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
