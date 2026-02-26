/**
 * 감성적 메시지 유틸리티
 * 시간대별, 요일별, 계절별 맞춤 인사와 메시지를 제공합니다.
 */

// 시간대 구분
export function getTimeOfDay(date: Date = new Date()): 'dawn' | 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night' | 'lateNight' {
  const hour = date.getHours();

  if (hour >= 0 && hour < 6) return 'dawn';
  if (hour >= 6 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 12) return 'afternoon';
  if (hour >= 12 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'night';
  return 'lateNight';
}

// 요일 구분
export function getDayOfWeek(date: Date = new Date()): 'monday' | 'friday' | 'weekend' | 'weekday' {
  const day = date.getDay();
  if (day === 1) return 'monday';
  if (day === 5) return 'friday';
  if (day === 0 || day === 6) return 'weekend';
  return 'weekday';
}

// 계절 구분
export function getSeason(date: Date = new Date()): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

// 시간대별 인사말
export function getTimeBasedGreeting(): { title: string; subtitle: string } {
  const timeOfDay = getTimeOfDay();
  const dayOfWeek = getDayOfWeek();

  const greetings: Record<string, { title: string; subtitle: string }> = {
    // 새벽 (0-6시)
    dawn: {
      title: '아직 잠들지 못하셨나요',
      subtitle: '혼자 깨어있는 시간, 무슨 일이 있으셨나요',
    },

    // 아침 (6-9시) - 월요일 특별 처리
    morning: dayOfWeek === 'monday' ? {
      title: '새로운 한 주가 시작됐네요',
      subtitle: '마음은 준비가 되셨나요',
    } : {
      title: '좋은 아침이에요',
      subtitle: '오늘 마음은 어떠세요',
    },

    // 점심 (12-14시)
    lunch: {
      title: '잠깐 쉬어가는 중이신가요',
      subtitle: '어떤 이야기를 나눠볼까요',
    },

    // 오후 (9-12시, 14-18시)
    afternoon: {
      title: '오늘 하루는 어떠세요',
      subtitle: '마음에 걸리는 게 있다면 편하게 말씀해 주세요',
    },

    // 저녁 (18-21시) - 금요일 특별 처리
    evening: dayOfWeek === 'friday' ? {
      title: '한 주가 끝나가네요',
      subtitle: '쌓인 이야기가 있으신가요',
    } : {
      title: '오늘 하루도 수고 많으셨어요',
      subtitle: '마음에 걸리는 게 있다면 편하게 말씀해 주세요',
    },

    // 밤 (21-24시)
    night: {
      title: '하루 어떠셨어요',
      subtitle: '마음에 남는 게 있나요',
    },

    // 심야 (24-0시, 실제로는 dawn과 동일)
    lateNight: {
      title: '긴 하루였나 봐요',
      subtitle: '오늘 하루 어떠셨는지 듣고 싶어요',
    },
  };

  return greetings[timeOfDay] || greetings.afternoon;
}

// 계절/날씨 감성 메시지 (선택적으로 표시)
export function getSeasonalMessage(): string | null {
  const season = getSeason();
  const dayOfWeek = getDayOfWeek();
  const timeOfDay = getTimeOfDay();
  const date = new Date();
  const day = date.getDay();
  const hour = date.getHours();

  // 10% 확률로만 표시 (너무 자주 나오면 형식적)
  if (Math.random() > 0.1) return null;

  const messages: string[] = [];

  // 계절별 메시지
  const seasonalMessages: Record<string, string[]> = {
    spring: [
      '봄바람이 불어오네요. 마음도 따뜻해지면 좋겠어요',
      '새로운 시작의 계절이에요. 무언가 시작하고 싶으신가요',
    ],
    summer: [
      '더운 여름이네요. 지치지 않게 조심하세요',
      '여름 햇살이 뜨겁네요. 잠깐 쉬어가세요',
    ],
    autumn: [
      '선선한 바람이 부네요. 생각이 많아지는 계절이죠',
      '가을이에요. 마음이 조금 무거워지기 쉬운 때예요',
    ],
    winter: [
      '추운 겨울이네요. 따뜻한 위로가 필요하실까요',
      '겨울은 마음도 움츠러들기 쉬워요. 괜찮으세요',
    ],
  };

  messages.push(...seasonalMessages[season]);

  // 특정 상황별 메시지
  // 일요일 저녁 (일요병)
  if (day === 0 && hour >= 18) {
    messages.push('일요일 저녁이네요. 내일 생각에 마음이 무거우신가요');
  }

  // 월요일 아침
  if (day === 1 && hour >= 6 && hour < 12) {
    messages.push('월요일 아침이에요. 새로운 한 주, 부담스럽지 않으세요');
  }

  // 금요일 저녁
  if (day === 5 && hour >= 18) {
    messages.push('한 주를 마무리하는 시간이네요. 이번 주는 어떠셨나요');
  }

  // 새벽
  if (hour >= 0 && hour < 6) {
    messages.push('늦은 시간이네요. 잠들기 어려우신가요');
  }

  return messages.length > 0 ? messages[Math.floor(Math.random() * messages.length)] : null;
}

// 공책 관련 감성 메시지
export function getNotebookMessages() {
  return {
    opening: [
      '공책을 펼치는 중...',
      '새 페이지를 여는 중...',
      '당신의 이야기를 기다리고 있어요...',
    ],
    writing: [
      '경청하려 자세를 고쳐앉는 중...',
      '귀 기울여 듣는 중...',
      '당신의 말을 받아 적는 중...',
    ],
    closing: [
      '오늘 이야기를 소중히 간직할게요',
      '공책을 닫는 중...',
      '다음에 또 이야기 나눠요',
    ],
  };
}

// 공책 별칭 자동 제안
export function suggestNotebookAliases(category?: string, summary?: string): string[] {
  const timeOfDay = getTimeOfDay();
  const season = getSeason();
  const date = new Date();

  const aliases: string[] = [];

  // 시간대 기반
  const timeBasedAliases: Record<string, string[]> = {
    dawn: ['잠 못 이루던 밤', '새벽의 생각들', '혼자 깨어있던 시간'],
    morning: ['아침의 다짐', '새로운 시작', '아침 마음'],
    lunch: ['점심의 짧은 쉼', '오후를 앞둔 생각'],
    afternoon: ['오후의 고민', '낮의 이야기'],
    evening: ['하루를 마무리하며', '저녁의 회고', '하루의 끝'],
    night: ['밤의 대화', '잠들기 전 생각', '오늘 하루'],
    lateNight: ['긴 밤의 이야기', '늦은 밤의 고백'],
  };

  aliases.push(...(timeBasedAliases[timeOfDay] || []));

  // 계절 기반
  const seasonBasedAliases: Record<string, string[]> = {
    spring: ['봄날의 마음', '새싹처럼'],
    summer: ['여름밤의 생각', '더운 날의 고민'],
    autumn: ['가을 감성', '낙엽처럼 떨어지는 마음'],
    winter: ['겨울 밤의 위로', '추운 날의 따뜻한 말'],
  };

  aliases.push(...(seasonBasedAliases[season] || []));

  // 요일 기반
  const day = date.getDay();
  if (day === 1) aliases.push('월요일의 무게', '새 주의 시작');
  if (day === 5) aliases.push('금요일의 해방감', '한 주의 마무리');
  if (day === 0 || day === 6) aliases.push('주말의 여유', '쉬는 날의 생각');

  // 카테고리 기반
  const categoryAliases: Record<string, string[]> = {
    work: ['일에 대한 고민', '직장에서의 하루', '업무 스트레스'],
    relationship: ['관계에 대한 생각', '사람들 사이에서', '마음이 복잡한 관계'],
    self: ['나에 대한 질문', '내 마음을 들여다보며', '자기 성찰의 시간'],
    future: ['앞으로의 길', '미래에 대한 불안', '앞날의 고민'],
    family: ['가족에 대한 마음', '집안 이야기'],
    love: ['사랑에 대한 고민', '연애 이야기'],
    daily: ['일상 속 감정', '평범한 하루'],
  };

  if (category && categoryAliases[category]) {
    aliases.push(...categoryAliases[category]);
  }

  // 일반적인 감성 별칭
  aliases.push(
    '마음이 무거웠던 날',
    '조금 가벼워진 저녁',
    '털어놓고 싶었던 말들',
    '혼자 품고 있던 이야기',
    '말하기 어려웠던 것들',
    '듣고 싶었던 위로',
    '정리가 필요했던 마음',
    '나눠서 가벼워진 고민',
  );

  // 랜덤하게 6개 선택
  const shuffled = aliases.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
}
