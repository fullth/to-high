import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SessionRepository } from './session/session.repository';
import { UserRepository } from './user/user.repository';

@Module({
  imports: [DatabaseModule],
  providers: [UserRepository, SessionRepository],
  exports: [UserRepository, SessionRepository],
})
export class PersistenceModule {}
