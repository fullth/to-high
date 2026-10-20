import { HttpException } from '@nestjs/common';

export const CHAT_ERROR_CODES = [
  'TIMEOUT',
  'RATE_LIMITED',
  'BUSY',
  'UNAVAILABLE',
  'AUTH_REQUIRED',
  'INVALID_INPUT',
  'SUMMARY_FAILED',
  'INTERRUPTED',
] as const;
export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];

export class ChatFailure extends HttpException {
  constructor(
    readonly code: ChatErrorCode,
    status = 503,
  ) {
    super({ code }, status);
  }
}

export function chatErrorCode(error: unknown): ChatErrorCode {
  if (error instanceof ChatFailure) return error.code;
  if (error instanceof HttpException) {
    const body = error.getResponse();
    if (
      typeof body === 'object' &&
      body &&
      'code' in body &&
      CHAT_ERROR_CODES.includes(body.code as ChatErrorCode)
    )
      return body.code as ChatErrorCode;
    if (error.getStatus() === 429) return 'RATE_LIMITED';
    if (error.getStatus() === 401 || error.getStatus() === 403)
      return 'AUTH_REQUIRED';
    if (error.getStatus() === 400 || error.getStatus() === 413)
      return 'INVALID_INPUT';
  }
  return 'UNAVAILABLE';
}
