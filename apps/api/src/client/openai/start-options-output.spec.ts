import { parseStartOptionsOutput } from './start-options-output';
const options = [
  '놓친 티켓이 계속 생각나요',
  '잠깐 쉬어가고 싶어요',
  '다음 티켓팅이 걱정돼요',
  '좋아하는 공연 얘기를 하고 싶어요',
];
describe('initial option output contract', () => {
  it('accepts exactly four distinct bounded choices', () =>
    expect(parseStartOptionsOutput(JSON.stringify({ options }), [])).toEqual(
      options,
    ));
  it.each([
    JSON.stringify({
      options: [...options.slice(0, 3), '다른 이야기로 시작할게요'],
    }),
    JSON.stringify({ options: [...options.slice(0, 3), '!!'] }),
    '{}',
    'not-json',
    JSON.stringify({ options: options.slice(0, 3) }),
    JSON.stringify({ options: [...options, '다른 선택지예요'] }),
    JSON.stringify({
      options: [options[0], options[0], options[2], options[3]],
    }),
    JSON.stringify({ options: [...options.slice(0, 3), '가'.repeat(25)] }),
    JSON.stringify({ options: [...options.slice(0, 3), '<script>예요'] }),
    JSON.stringify({ options, reply: '추가 응답' }),
  ])('rejects malformed or unsafe model output %s', (content) =>
    expect(() => parseStartOptionsOutput(content, [])).toThrow(),
  );
  it('rejects a normalized repeat of a previous choice', () =>
    expect(() =>
      parseStartOptionsOutput(JSON.stringify({ options }), [
        '놓친 티켓이 계속 생각나요!',
      ]),
    ).toThrow());
});
