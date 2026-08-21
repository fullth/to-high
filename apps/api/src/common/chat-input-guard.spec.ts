import { detectCostGuardReason, normalizeUserInput } from './chat-input-guard';

describe('chat input cost guard', () => {
  it('저장용 접두사를 제거하고 입력을 정규화한다', () => {
    expect(normalizeUserInput('[위기 감지: high] 나:  살기 싫어요 ')).toBe(
      '살기 싫어요',
    );
  });

  it('기호와 테스트 입력을 저정보 입력으로 판정한다', () => {
    expect(detectCostGuardReason('ㅋㅋㅋ', [])).toBe('low-information');
    expect(detectCostGuardReason('test', [])).toBe('low-information');
  });

  it('동일한 사용자 입력이 세 번째 반복될 때만 반복으로 판정한다', () => {
    const context = ['나: 같은 말', '상담사: 들었어요', '나: 같은 말'];

    expect(detectCostGuardReason('같은 말', context)).toBe('repeated');
    expect(detectCostGuardReason('다른 말', context)).toBeNull();
  });

  it('위기 표현은 저정보 입력으로 판정하지 않는다', () => {
    expect(detectCostGuardReason('죽고 싶어요', [])).toBeNull();
    expect(detectCostGuardReason('살기 싫어요', [])).toBeNull();
  });
});
