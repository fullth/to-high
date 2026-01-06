import { Module } from '@nestjs/common';
import { OpenAIAgent } from './openai.agent';

@Module({
  providers: [OpenAIAgent],
  exports: [OpenAIAgent],
})
export class OpenAIModule {}
