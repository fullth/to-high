import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SessionRepository } from './session/session.repository';
import { UserRepository } from './user/user.repository';
import { UserProfileRepository } from './user-profile/user-profile.repository';

@Module({
  imports: [DatabaseModule],
  providers: [UserRepository, SessionRepository, UserProfileRepository],
  exports: [UserRepository, SessionRepository, UserProfileRepository],
})
export class PersistenceModule {}
