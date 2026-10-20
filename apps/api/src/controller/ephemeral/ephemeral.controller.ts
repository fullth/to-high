import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { EphemeralBudgetService } from '../../common/ephemeral-budget.service';
import { EphemeralService } from '../../app/ephemeral/ephemeral.service';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt.guard';
import { LimitChatGeneration } from '../../common/chat-rate-limit';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { chatErrorCode } from '../../common/chat-failure';
import { recordChatRequest } from '../../common/chat-metrics';
import { EphemeralRequestSchema } from './ephemeral.request';
import type { EphemeralRequest } from './ephemeral.request';

type AuthRequest = Request & {
  user?: { userId?: string };
  chatMetricsRecorded?: boolean;
};
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
    @Res() response: Response,
  ) {
    const started = performance.now();
    let firstToken: number | undefined;
    let outcome = 'ok';
    let release: (() => void) | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const streaming = request.headers?.accept?.includes('text/event-stream');
    const controller = new AbortController();
    const cancel = () => {
      if (!response.writableEnded) controller.abort();
    };
    response.setHeader('Cache-Control', 'no-store, no-transform');
    response.once('close', cancel);
    try {
      release = this.budget.acquireOwner(
        request.user?.userId,
        request.ip || request.socket.remoteAddress || 'unknown',
      );
      if (streaming) {
        response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        response.setHeader('X-Accel-Buffering', 'no');
        response.flushHeaders();
        heartbeat = setInterval(() => {
          if (!controller.signal.aborted) response.write(': keepalive\n\n');
        }, 10_000);
      }
      const result = await this.service.respond(
        body,
        request.user?.userId,
        controller.signal,
        streaming
          ? (event) => {
              if (controller.signal.aborted) return;
              if (event.type === 'delta' && firstToken === undefined)
                firstToken = performance.now() - started;
              response.write(`data: ${JSON.stringify(event)}\n\n`);
            }
          : undefined,
      );
      if (!controller.signal.aborted) {
        if (streaming) {
          response.write('data: {"type":"done"}\n\n');
          response.end();
        } else response.json(result);
      }
    } catch (error) {
      outcome = chatErrorCode(error);
      if (streaming && response.headersSent && !controller.signal.aborted) {
        response.write(
          `data: ${JSON.stringify({ type: 'error', code: outcome })}\n\n`,
        );
        response.end();
      } else if (!controller.signal.aborted) throw error;
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      response.removeListener('close', cancel);
      release?.();
      request.chatMetricsRecorded = true;
      recordChatRequest(
        controller.signal.aborted ? 'cancelled' : outcome,
        performance.now() - started,
        firstToken,
      );
    }
  }
}
