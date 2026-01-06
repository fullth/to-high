import { Module } from '@nestjs/common';
import { OpenAIModule } from '../../client/openai/openai.module';
import { SessionModule } from '../session/session.module';
import { ChatService } from './chat.service';

@Module({
  imports: [SessionModule, OpenAIModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
