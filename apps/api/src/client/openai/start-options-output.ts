import { z } from 'zod';

const key = (text: string) =>
  text
    .normalize('NFKC')
    .replace(/[\s\p{P}]/gu, '')
    .toLowerCase();
export function parseStartOptionsOutput(
  content: string,
  previous: readonly string[],
): string[] {
  const parsed = z
    .object({ options: z.array(z.string().trim().min(2).max(24)).length(4) })
    .strict()
    .parse(JSON.parse(content));
  const keys = parsed.options.map(key);
  if (
    keys.some((value) => !value) ||
    new Set(keys).size !== 4 ||
    keys.some((value) =>
      ['다른 이야기로 시작할게요', '직접 입력할게요', '선택지로 돌아가기'].some(
        (control) => key(control) === value,
      ),
    ) ||
    parsed.options.some(
      (option) => /[\r\n?？<>]/u.test(option) || /https?:\/\//i.test(option),
    ) ||
    keys.some((value) => previous.some((before) => key(before) === value))
  )
    throw new Error('Invalid start options');
  return parsed.options;
}
