import { Module } from '@nestjs/common';
import { OpenAIModule } from '../../client/openai/openai.module';
import { SavedSessionsService } from './saved-sessions.service';

@Module({ imports: [OpenAIModule], providers: [SavedSessionsService], exports: [SavedSessionsService] })
export class SavedSessionsModule {}
