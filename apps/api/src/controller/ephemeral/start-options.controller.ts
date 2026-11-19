import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt.guard';
import { LimitChatGeneration } from '../../common/chat-rate-limit';
import { EphemeralBudgetService } from '../../common/ephemeral-budget.service';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { StartOptionsService } from '../../app/ephemeral/start-options.service';
import { StartOptionsRequestSchema } from './start-options.request';
import type { StartOptionsRequest } from './start-options.request';

@Controller('ephemeral')
@UseGuards(OptionalJwtAuthGuard)
export class StartOptionsController {
  constructor(
    private readonly service: StartOptionsService,
    private readonly budget: EphemeralBudgetService,
  ) {}
  @Post('start-options')
  @HttpCode(200)
  @LimitChatGeneration()
  async generate(
    @Body(new ZodValidationPipe(StartOptionsRequestSchema))
    body: StartOptionsRequest,
    @Req() request: Request & { user?: { userId?: string } },
    @Res() response: Response,
  ) {
    const controller = new AbortController();
    const cancel = () => {
      if (!response.writableEnded) controller.abort();
    };
    response.setHeader('Cache-Control', 'no-store');
    response.once('close', cancel);
    let release: (() => void) | undefined;
    try {
      release = this.budget.acquireOwner(
        request.user?.userId,
        request.ip || request.socket.remoteAddress || 'unknown',
        'start-options',
      );
      const result = await this.service.generate(
        body.context,
        body.previous,
        controller.signal,
      );
      if (!controller.signal.aborted) response.json(result);
    } finally {
      response.removeListener('close', cancel);
      release?.();
    }
  }
}
