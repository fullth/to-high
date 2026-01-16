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

export function detectCrisis(text: string): CrisisDetectionResult {
  const normalizedText = text.toLowerCase().replace(/\s+/g, '');
  const matchedKeywords: string[] = [];
  let detectedLevel: 'none' | 'low' | 'medium' | 'high' = 'none';

  for (const keyword of CRISIS_KEYWORDS.high) {
    if (normalizedText.includes(keyword.replace(/\s+/g, ''))) {
      matchedKeywords.push(keyword);
      detectedLevel = 'high';
    }
  }

  if (detectedLevel !== 'high') {
    for (const keyword of CRISIS_KEYWORDS.medium) {
      if (normalizedText.includes(keyword.replace(/\s+/g, ''))) {
        matchedKeywords.push(keyword);
        detectedLevel = 'medium';
      }
    }
  }

  if (detectedLevel === 'none') {
    for (const keyword of CRISIS_KEYWORDS.low) {
      if (normalizedText.includes(keyword.replace(/\s+/g, ''))) {
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
