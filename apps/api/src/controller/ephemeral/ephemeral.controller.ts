import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { EphemeralBudgetService } from '../../common/ephemeral-budget.service';
import { EphemeralService } from '../../app/ephemeral/ephemeral.service';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt.guard';
import { LimitChatGeneration } from '../../common/chat-rate-limit';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { EphemeralRequestSchema } from './ephemeral.request';
import type { EphemeralRequest } from './ephemeral.request';

type AuthRequest = Request & { user?: { userId?: string } };
@Controller('ephemeral')
@UseGuards(OptionalJwtAuthGuard)
export class EphemeralController {
  constructor(
    private readonly service: EphemeralService,
    private readonly budget: EphemeralBudgetService,
  ) {}

  @Post('respond')
  @LimitChatGeneration()
  async respond(
    @Body(new ZodValidationPipe(EphemeralRequestSchema)) body: EphemeralRequest,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    const release = this.budget.acquireOwner(
      request.user?.userId,
      request.ip || request.socket.remoteAddress || 'unknown',
    );
    const controller = new AbortController();
    const cancel = () => {
      if (!response.writableEnded) controller.abort();
    };
    response.once('close', cancel);
    try {
      return await this.service.respond(
        body,
        request.user?.userId,
        controller.signal,
      );
    } finally {
      response.removeListener('close', cancel);
      release();
    }
  }
}
