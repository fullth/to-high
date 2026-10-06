import { buildCounselingContext } from './counseling-context';

describe('buildCounselingContext', () => {
  it('오래된 요약과 최근 대화를 순서대로 유지하고 원본을 변경하지 않는다', () => {
    const session = {
      rollingSummary: '이전 갈등',
      context: ['나: 지금은 슬퍼요', '상담사: 들었어요'],
    };
    expect(buildCounselingContext(session)).toEqual([
      '[이전 대화 요약] 이전 갈등',
      ...session.context,
    ]);
    expect(session.context).toHaveLength(2);
  });
  it('요약 없는 기존 세션도 같은 최근 이력을 사용한다', () => {
    expect(buildCounselingContext({ context: ['나: 힘들어요'] })).toEqual([
      '나: 힘들어요',
    ]);
  });
});
