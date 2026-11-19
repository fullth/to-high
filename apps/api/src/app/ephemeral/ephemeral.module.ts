import { StartOptionsService } from './start-options.service';
import { EphemeralBudgetService } from '../../common/ephemeral-budget.service';
import { Module } from '@nestjs/common';
import { OpenAIModule } from '../../client/openai/openai.module';
import { CharacterModule } from '../character/character.module';
import { EphemeralService } from './ephemeral.service';
@Module({
  imports: [OpenAIModule, CharacterModule],
  providers: [StartOptionsService, EphemeralService, EphemeralBudgetService],
  exports: [StartOptionsService, EphemeralService, EphemeralBudgetService],
})
export class EphemeralModule {}
