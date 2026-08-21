export interface CrisisDetectionResult {
  isCrisis: boolean;
  level: 'none' | 'low' | 'medium' | 'high';
  matchedKeywords: string[];
  recommendedAction?: string;
}

const CRISIS_KEYWORDS = {
  high: [
    '자살',
    '죽고 싶',
    '죽고싶',
    '죽어버리고',
    '죽어버릴',
    '자해',
    '손목',
    '목숨',
    '끝내고 싶',
    '사라지고 싶',
    '없어지고 싶',
    '죽을래',
    '그만 살고 싶',
    '영원히 자고 싶',
    '뛰어내리고 싶',
    '약을 다 먹을까',
    'i want to die',
    'i wanna die',
    "i don't want to live anymore",
    'i am suicidal',
    'i will kill myself',
    'i wish i were dead',
    'i want to end my life',
    'i am going to kill myself',
    'i want to hurt myself',
    '死にたい',
    '自殺したい',
    'もう生きたくない',
    '消えたい',
    '我想死',
    '我不想活了',
    '我想自杀',
  ],
  medium: [
    '살기 싫',
    '살기싫',
    '힘들어 죽겠',
    '못 살겠',
    '포기하고 싶',
    '다 끝났',
    '희망이 없',
    '의미가 없',
    '내일이 오지 않았으면',
  ],
  low: ['너무 힘들', '우울', '무기력', '잠을 못', '식욕이 없', '혼자인 것 같'],
};

const CRISIS_RESOURCES = {
  high: `
지금 많이 힘드시군요. 혼자 감당하지 않으셔도 됩니다.

📞 자살예방상담전화: 1393 (24시간)
📞 정신건강위기상담전화: 1577-0199
📞 생명의전화: 1588-9191

전문 상담사가 24시간 대기하고 있어요.
지금 바로 전화해보시는 건 어떨까요?`,
  medium: `
많이 힘든 상황이시네요. 전문가의 도움이 필요할 수 있어요.

📞 정신건강위기상담전화: 1577-0199
🏥 가까운 정신건강복지센터를 방문해보시는 것도 좋아요.

혼자 감당하려 하지 않으셔도 됩니다.`,
  low: '',
};

const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];
const JUNGSEONG = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
];
const JONGSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

function normalizeCrisisText(text: string): string {
  return Array.from(text.normalize('NFKD').toLocaleLowerCase('ko-KR'))
    .map((character) => {
      const codePoint = character.codePointAt(0)!;
      if (codePoint >= 0x1100 && codePoint <= 0x1112) {
        return CHOSEONG[codePoint - 0x1100];
      }
      if (codePoint >= 0x1161 && codePoint <= 0x1175) {
        return JUNGSEONG[codePoint - 0x1161];
      }
      if (codePoint >= 0x11a8 && codePoint <= 0x11c2) {
        return JONGSEONG[codePoint - 0x11a8];
      }
      return character;
    })
    .join('')
    .replace(/[\p{C}\p{Z}\p{P}\p{S}\p{M}]/gu, '');
}

export function detectCrisis(text: string): CrisisDetectionResult {
  const normalizedText = normalizeCrisisText(text);
  const matchedKeywords: string[] = [];
  let detectedLevel: 'none' | 'low' | 'medium' | 'high' = 'none';

  for (const keyword of CRISIS_KEYWORDS.high) {
    if (normalizedText.includes(normalizeCrisisText(keyword))) {
      matchedKeywords.push(keyword);
      detectedLevel = 'high';
    }
  }

  if (detectedLevel !== 'high') {
    for (const keyword of CRISIS_KEYWORDS.medium) {
      if (normalizedText.includes(normalizeCrisisText(keyword))) {
        matchedKeywords.push(keyword);
        detectedLevel = 'medium';
      }
    }
  }

  if (detectedLevel === 'none') {
    for (const keyword of CRISIS_KEYWORDS.low) {
      if (normalizedText.includes(normalizeCrisisText(keyword))) {
        matchedKeywords.push(keyword);
        detectedLevel = 'low';
      }
    }
  }

  return {
    isCrisis: detectedLevel === 'high' || detectedLevel === 'medium',
    level: detectedLevel,
    matchedKeywords,
    recommendedAction:
      CRISIS_RESOURCES[detectedLevel as keyof typeof CRISIS_RESOURCES] ||
      undefined,
  };
}
