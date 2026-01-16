import { Module } from '@nestjs/common';
import { OpenAIModule } from '../../client/openai/openai.module';
import { PersistenceModule } from '../../persistence/persistence.module';
import { SessionModule } from '../session/session.module';
import { ChatService } from './chat.service';

@Module({
  imports: [SessionModule, OpenAIModule, PersistenceModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
