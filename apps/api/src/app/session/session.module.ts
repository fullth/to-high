import { Module } from '@nestjs/common';
import { OpenAIModule } from '../../client/openai/openai.module';
import { PersistenceModule } from '../../persistence/persistence.module';
import { SessionService } from './session.service';

@Module({
  imports: [PersistenceModule, OpenAIModule],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
