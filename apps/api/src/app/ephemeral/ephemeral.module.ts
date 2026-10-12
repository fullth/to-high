import { EphemeralBudgetService } from '../../common/ephemeral-budget.service';
import { Module } from '@nestjs/common';
import { OpenAIModule } from '../../client/openai/openai.module';
import { CharacterModule } from '../character/character.module';
import { EphemeralService } from './ephemeral.service';
@Module({
  imports: [OpenAIModule, CharacterModule],
  providers: [EphemeralService, EphemeralBudgetService],
  exports: [EphemeralService, EphemeralBudgetService],
})
export class EphemeralModule {}
