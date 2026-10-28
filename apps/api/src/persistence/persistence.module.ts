import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SessionRepository } from './session/session.repository';
import { UserRepository } from './user/user.repository';
import { UserProfileRepository } from './user-profile/user-profile.repository';
import { AuthSessionRepository } from './auth-session/auth-session.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    UserRepository,
    SessionRepository,
    UserProfileRepository,
    AuthSessionRepository,
  ],
  exports: [
    UserRepository,
    SessionRepository,
    UserProfileRepository,
    AuthSessionRepository,
  ],
})
export class PersistenceModule {}
