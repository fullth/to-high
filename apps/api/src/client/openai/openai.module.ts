import { Module } from '@nestjs/common';
import { OpenAIAgent } from './openai.agent';
import { BudgetModule } from '../../common/budget.module';

@Module({
  imports: [BudgetModule],
  providers: [OpenAIAgent],
  exports: [OpenAIAgent],
})
export class OpenAIModule {}
