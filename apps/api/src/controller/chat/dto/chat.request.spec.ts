import { CHAT_LIMITS } from '../../../common/chat-limits';
import {
  SelectOptionSchema,
  SendMessageSchema,
  StartSessionSchema,
  SummarizeTextSchema,
} from './chat.request';

const SESSION_ID = '507f1f77bcf86cd799439011';

describe('chat request schemas', () => {
  it('직접 입력과 메시지는 서버 상한을 초과하면 거부한다', () => {
    const oversized = '가'.repeat(CHAT_LIMITS.inputLength + 1);

    expect(
      StartSessionSchema.safeParse({ initialText: oversized }).success,
    ).toBe(false);
    expect(
      SendMessageSchema.safeParse({ sessionId: SESSION_ID, message: oversized })
        .success,
    ).toBe(false);
  });

  it('요약 원문도 별도 서버 상한을 초과하면 거부한다', () => {
    const oversized = '가'.repeat(CHAT_LIMITS.importTextLength + 1);

    expect(SummarizeTextSchema.safeParse({ text: oversized }).success).toBe(
      false,
    );
  });

  it('Mongo ObjectId 형식이 아닌 세션 ID와 알 수 없는 필드를 거부한다', () => {
    expect(
      SelectOptionSchema.safeParse({
        sessionId: 'not-an-object-id',
        selectedOption: '힘들어요',
      }).success,
    ).toBe(false);
    expect(
      SelectOptionSchema.safeParse({
        sessionId: SESSION_ID,
        selectedOption: '힘들어요',
        unexpected: true,
      }).success,
    ).toBe(false);
  });

  it('공백뿐인 입력을 거부하고 정상 입력은 trim한다', () => {
    expect(
      SendMessageSchema.safeParse({ sessionId: SESSION_ID, message: '   ' })
        .success,
    ).toBe(false);
    expect(
      SendMessageSchema.parse({
        sessionId: SESSION_ID,
        message: '  힘들어요  ',
      }).message,
    ).toBe('힘들어요');
  });

  it('외부 메시지 요청에서는 message를 반드시 요구한다', () => {
    expect(SendMessageSchema.safeParse({ sessionId: SESSION_ID }).success).toBe(
      false,
    );
  });
});
