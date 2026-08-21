const STORED_INPUT_PREFIXES = [
  /^\[\s*위기 감지:[^\]]*\]\s*/,
  /^\[\s*사용자 직접 입력\s*\]\s*/,
  /^\[\s*말하기 어려움 선택\s*\]\s*/,
  /^나:\s*/,
];

const LOW_INFORMATION_PATTERN =
  /^(?:[.?!,;~ㅋㅎㄷㅇㄴㅁㅜㅠㅗㅓㅏㅑㅐㅔ\u1100-\u11ff]+|asdf|qwer|test|테스트|[0-9]{1,4})$/i;

export type CostGuardReason = 'low-information' | 'repeated';

export function normalizeUserInput(input: string): string {
  let normalized = input.normalize('NFKC').trim();
  for (const prefix of STORED_INPUT_PREFIXES) {
    normalized = normalized.replace(prefix, '').trim();
  }
  return normalized.replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');
}

export function detectCostGuardReason(
  input: string,
  context: string[],
): CostGuardReason | null {
  const normalized = normalizeUserInput(input);
  if (!normalized || LOW_INFORMATION_PATTERN.test(normalized)) {
    return 'low-information';
  }

  const previousUserInputs = context
    .filter((entry) =>
      /^(?:\[\s*(?:위기 감지:|사용자 직접 입력|말하기 어려움 선택))|^나:/.test(
        entry,
      ),
    )
    .map(normalizeUserInput)
    .filter(Boolean);
  const twoPreviousInputs = previousUserInputs.slice(-2);

  return twoPreviousInputs.length === 2 &&
    twoPreviousInputs.every((previous) => previous === normalized)
    ? 'repeated'
    : null;
}
