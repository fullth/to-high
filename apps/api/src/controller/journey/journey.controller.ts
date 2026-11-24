import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { JourneyService } from '../../app/journey/journey.service';
import { JourneyEventSchema } from '../../app/journey/journey';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
@Controller('journey')
export class JourneyController {
  constructor(private readonly journey: JourneyService) {}
  @Post('events')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async event(
    @Body(new ZodValidationPipe(JourneyEventSchema))
    body: z.infer<typeof JourneyEventSchema>,
  ) {
    await this.journey.record(
      body.journey,
      body.event === 'character_selected'
        ? ['selected', 'character_selected']
        : [body.event],
    );
  }
}
