import { Module } from '@nestjs/common';
import { JourneyRepository } from '../../persistence/journey/journey.repository';
import { JourneyService } from './journey.service';
@Module({
  providers: [JourneyRepository, JourneyService],
  exports: [JourneyService],
})
export class JourneyModule {}
