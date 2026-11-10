import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import { chatErrorCode } from './chat-failure';
import { recordRejected } from './chat-metrics';
import type { IncidentService } from './incident.service';

/** Do not log arbitrary errors, provider messages or request data. */
@Catch()
export class PrivacyExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly frontendUrl = process.env.FRONTEND_URL ||
      'http://localhost:3001',
    private readonly incidents?: IncidentService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500) void this.incidents?.report('api_failure');
    // Guard rejections happen before the chat controller can start its timer.
    const request = host
      .switchToHttp()
      .getRequest<{
        path?: string;
        method?: string;
        chatMetricsRecorded?: boolean;
      }>();
    if (
      request?.method === 'GET' &&
      request.path?.replace(/\/+$/, '') === '/auth/google/callback' &&
      !response.headersSent
    ) {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.redirect(new URL('/problem', this.frontendUrl).toString());
      return;
    }
    if (request?.path === '/ephemeral/respond' && !request.chatMetricsRecorded)
      recordRejected(chatErrorCode(exception));
    const messages: Record<number, string> = {
      400: '입력 형식이나 길이를 확인해 주세요.',
      401: '로그인이 필요하거나 만료됐어요.',
      403: '접근할 수 없습니다.',
      404: '찾을 수 없습니다.',
      409: '이미 생성됐거나 변경된 내용입니다. 다시 확인해 주세요.',
      410: '이전 기록 기능은 제공하지 않습니다. 새 상담을 시작해 주세요.',
      413: '입력 크기 한도를 초과했어요.',
      429: '동시 요청 또는 사용량 한도에 도달했어요. 잠시 후 다시 시도해 주세요.',
      503: '지금은 답변을 만들 수 없어요. 잠시 후 다시 시도해 주세요.',
    };
    if (!response.headersSent)
      response.status(status).json({
        statusCode: status,
        code: chatErrorCode(exception),
        message: messages[status] || '요청을 처리하지 못했어요.',
      });
  }
}
