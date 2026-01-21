import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateOptionsResult } from '../../types/chat';
import { Category, ResponseMode } from '../../types/session';

const CATEGORY_CONTEXTS: Record<Category, string> = {
  self: `주제: 자기 자신에 대한 고민 (자존감, 불안, 우울, 정체성)
탐색 방향: 감정의 원인, 지속 기간, 일상 영향도, 자기 인식`,
  future: `주제: 미래에 대한 고민 (진로, 목표, 불확실함, 선택)
탐색 방향: 구체적 고민 영역, 현재 상황, 원하는 방향, 장애물`,
  work: `주제: 직장 관련 고민 (업무, 상사, 동료, 번아웃)
탐색 방향: 구체적 상황, 관계 역학, 감정 상태, 원하는 변화`,
  relationship: `주제: 인간관계 고민 (친구, 가족, 지인)
탐색 방향: 관계 유형, 갈등 상황, 감정, 기대와 현실의 차이`,
  love: `주제: 연애 고민 (썸, 연인, 짝사랑, 이별)
탐색 방향: 현재 상태, 상대방과의 관계, 감정, 고민되는 부분`,
  daily: `주제: 일상적인 지침과 피로 (무기력, 스트레스, 일상 피로)
탐색 방향: 피로의 원인, 일상 패턴, 에너지 수준, 작은 기쁨 찾기`,
  other: `주제: 말로 표현하기 어려운 고민 (혼란, 막연함, 복합적 감정)
탐색 방향: 현재 느끼는 감정, 가장 불편한 것, 원하는 것`,
  direct: `주제: 사용자가 직접 입력한 고민 (자유 형식)
탐색 방향: 사용자가 입력한 내용을 기반으로 핵심 감정과 상황 파악, 필요한 부분 추가 탐색`,
};

// 카테고리별 첫 질문 힌트 (AI가 참고할 가이드)
const INITIAL_QUESTION_HINTS: Record<Category, string> = {
  self: '나 자신에 대한 고민을 선택함. 자존감, 불안, 우울, 정체성 등에 대해 물어보기',
  future: '미래에 대한 고민을 선택함. 진로, 목표, 불확실함에 대해 물어보기',
  work: '일/직장 고민을 선택함. 업무, 관계, 번아웃 등에 대해 물어보기',
  relationship: '인간관계 고민을 선택함. 가족, 친구, 지인 관계에 대해 물어보기',
  love: '연애 고민을 선택함. 썸, 연인, 이별, 짝사랑 등에 대해 물어보기',
  daily: '일상 피로를 선택함. 지침, 무기력, 스트레스에 대해 물어보기',
  other: '기타/말하기 어려움을 선택함. 현재 기분과 상태에 대해 물어보기',
  direct: '직접 입력으로 고민을 말함. 내용을 바탕으로 공감하고 더 물어보기',
};

const QUESTION_DEPTH_GUIDE = `
질문 깊이 가이드:
- 1-2번째 응답: 상황 파악 (무엇이, 언제, 누구와)
- 3-4번째 응답: 감정 탐색 (어떤 기분, 얼마나 힘든지)
- 5번째 이상: 충분히 파악됨, canProceedToResponse: true

컨텍스트가 5개 이상이고 핵심 감정과 상황이 파악되면 반드시 canProceedToResponse를 true로 설정하세요.
`;

@Injectable()
export class OpenAIAgent {
  private openai: OpenAI;
  private hasApiKey: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.hasApiKey = !!apiKey && apiKey.length > 0;
    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  async generateOptions(
    context: string[],
    currentStep: string,
    category?: Category,
  ): Promise<GenerateOptionsResult> {
    const contextCount = context.length;
    const categoryContext = category ? CATEGORY_CONTEXTS[category] : '';
    const questionHint =
      category && currentStep === 'initial'
        ? INITIAL_QUESTION_HINTS[category]
        : '';

    // API 키가 없으면 기본 응답 반환
    if (!this.hasApiKey) {
      return {
        question:
          '말씀해주셔서 감사해요. 조금 더 이야기해주실 수 있을까요?',
        options: ['네, 더 말할게요', '이 정도면 충분해요', '잘 모르겠어요'],
        canProceedToResponse: contextCount >= 3,
      };
    }

    const systemPrompt = `당신은 털어놓기 편한 대화 상대입니다. 상담사처럼 딱딱하지 않고, 진심으로 들어주는 사람이에요.

핵심 원칙:
1. 판단하지 않고 있는 그대로 들어주기
2. 상대방 입장에서 진심으로 공감하기
3. 따뜻하고 자연스러운 어조

${categoryContext}

${QUESTION_DEPTH_GUIDE}

현재 수집된 컨텍스트 수: ${contextCount}개
${questionHint ? `상황: ${questionHint}` : ''}

중요 - 응답 스타일:
1. question 필드: 공감 + 질문을 자연스럽게 이어서 작성
   - 먼저 상대방이 말한 내용에 짧게 공감하고, 자연스럽게 질문으로 이어가세요
   - 예: "그렇군요, 정말 힘드셨겠어요. 그게 언제부터 그러셨어요?"
   - 예: "네, 충분히 그러실 수 있어요. 혹시 더 이야기해주실 수 있을까요?"
   - 존댓말을 사용하되, 따뜻하고 부드럽게
   - 매번 다른 표현으로 자연스럽게 (같은 말 반복 금지)

2. 선택지 작성:
   - 3~4개의 선택지
   - 각 선택지는 반말체로 짧고 자연스럽게 (15자 이내)
   - "말하기 어려워" 같은 회피 선택지 1개 포함
   - 상황에 맞는 구체적인 선택지

JSON 형식으로만 응답:
{
  "question": "공감 + 질문이 자연스럽게 이어지는 문장 (존댓말)",
  "options": ["선택지1 (반말)", "선택지2 (반말)", "선택지3 (반말)", "말하기 어려워"],
  "canProceedToResponse": false
}`;

    const userPrompt =
      contextCount === 0
        ? `사용자가 "${category}" 카테고리를 선택했습니다. 첫 질문을 생성해주세요.`
        : `현재까지 대화 흐름:
${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}

현재 단계: ${currentStep}
사용자의 마지막 선택/입력에 공감하면서 다음 질문과 선택지를 생성해주세요.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async generateResponse(
    context: string[],
    mode: ResponseMode,
    userMessage?: string,
  ): Promise<string> {
    const modePrompts: Record<ResponseMode, string> = {
      comfort: `[위로 모드 - 공감과 정서적 지지]
목표: 내담자가 감정적으로 안전하다고 느끼게 하기

응답 구조:
1. 감정 반영: "~하셨군요", "~한 마음이 드셨겠어요"
2. 정서적 수용: "그런 상황에서 그렇게 느끼는 건 자연스러운 거예요"
3. 지지: "혼자 감당하느라 힘드셨을 거예요"

금지사항:
- 해결책 제시 금지
- "~해보세요" 같은 조언 금지
- 긍정적으로 생각하라는 말 금지`,

      organize: `[정리 모드 - 상황과 감정 분리]
목표: 복잡한 상황을 명확하게 구조화

응답 구조:
1. 상황 요약: "지금 상황을 정리해보면..."
2. 사실과 감정 분리: "일어난 일은 ~이고, 느끼신 감정은 ~인 것 같아요"
3. 핵심 포인트: "가장 마음에 걸리는 부분은 ~인 것 같네요"

금지사항:
- 판단하거나 평가 금지
- 누구 잘못인지 따지지 않기`,

      validate: `[검증 모드 - 감정의 타당성 확인]
목표: 내담자의 감정이 비정상이 아님을 확인

응답 구조:
1. 상황 인정: "그런 상황이었군요"
2. 감정 정상화: "그 상황에서 ~하게 느끼는 건 아주 자연스러운 반응이에요"
3. 보편성: "많은 사람들이 비슷한 상황에서 같은 감정을 느껴요"

다만 객관적으로 다른 시각도 있을 수 있다면:
"다만, ~한 관점도 있을 수 있어요. 하지만 지금 느끼는 감정 자체는 충분히 이해돼요"`,

      direction: `[방향 모드 - 작은 실천 제안]
목표: 실행 가능한 아주 작은 행동 1개 제안

응답 구조:
1. 상황 공감: 먼저 공감 표현
2. 작은 제안: "오늘 하루, 딱 하나만 해보는 건 어떨까요?"
3. 구체적 행동: 5분 이내에 할 수 있는 아주 작은 행동
4. 선택권 부여: "물론 안 하셔도 괜찮아요"

금지사항:
- 거창한 목표 금지
- 인생을 바꾸는 조언 금지
- 여러 개 제안 금지`,

      listen: `[경청 모드 - 최소 개입]
목표: 내담자가 자유롭게 이야기할 수 있는 공간 제공

응답 구조:
1. 짧은 반응: "네", "그랬군요", "계속 들을게요"
2. 열린 질문(선택적): "더 이야기해주실 수 있을까요?"

금지사항:
- 긴 응답 금지
- 분석이나 해석 금지
- 조언 금지`,

      similar: `[사례 모드 - 유사 경험 공유]
목표: 혼자가 아님을 느끼게 하기

응답 구조:
1. 공감: "그런 경험을 하고 계시는군요"
2. 보편성: "비슷한 고민을 하는 분들이 많아요"
3. 익명 사례: "어떤 분은 ~한 상황에서 ~하게 느꼈다고 해요"
4. 연결: "혼자만의 고민이 아니에요"

주의: 실제 사례가 아닌 일반화된 경험 공유`,
    };

    if (!this.hasApiKey) {
      return this.getFallbackResponse(mode, context);
    }

    const systemPrompt = `당신은 따뜻하고 전문적인 심리 상담사입니다.

상담 원칙:
- 무조건적 긍정적 존중
- 비판단적 태도
- 내담자 페이스 존중

${modePrompts[mode]}

응답 길이: 150-250자
말투: 부드럽고 따뜻하게, 존댓말 사용`;

    const userPrompt = `내담자 상담 기록:
${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${userMessage ? `내담자의 추가 메시지: "${userMessage}"` : '첫 응답을 해주세요.'}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
    });

    return response.choices[0].message.content || '';
  }

  private getFallbackResponse(mode: ResponseMode, context: string[]): string {
    const fallbacks: Record<ResponseMode, string> = {
      comfort:
        '말씀해주셔서 감사해요. 그런 상황에서 그렇게 느끼시는 건 정말 자연스러운 거예요. 혼자 감당하느라 많이 힘드셨을 거예요. 지금 이 순간, 당신의 감정은 충분히 이해받을 자격이 있어요.',
      listen:
        '네, 듣고 있어요. 더 이야기해주셔도 괜찮아요. 천천히, 편하게 말씀해주세요.',
      organize:
        '지금 상황을 정리해보면, 여러 가지가 복잡하게 얽혀있는 것 같아요. 하나씩 풀어가면서 마음을 정리해보는 건 어떨까요?',
      validate:
        '그 상황에서 그렇게 느끼시는 건 아주 자연스러운 반응이에요. 많은 분들이 비슷한 상황에서 같은 감정을 느끼세요. 당신의 감정은 전혀 이상하지 않아요.',
      direction:
        '지금 많이 힘드시죠. 오늘 하루, 딱 하나만 해보는 건 어떨까요? 잠깐 창문을 열고 바깥 공기를 마셔보세요. 작은 것부터 천천히요.',
      similar:
        '비슷한 고민을 하시는 분들이 정말 많아요. 어떤 분은 같은 상황에서 "나만 이런 줄 알았는데..."라고 하셨어요. 혼자만의 고민이 아니에요.',
    };
    return fallbacks[mode];
  }

  async summarizeSession(context: string[]): Promise<string> {
    if (!this.hasApiKey) {
      const keywords = context.slice(0, 3).join(', ');
      return `상담 주제: ${keywords}`;
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '세션 컨텍스트를 한 줄로 요약하세요. 개인정보 제외. 예: "이별 후 공허함, 위로 선호"',
        },
        { role: 'user', content: JSON.stringify(context) },
      ],
    });

    return response.choices[0].message.content || '';
  }

  /**
   * 선택 시 짧은 공감 코멘트 생성
   */
  async generateEmpathyComment(
    selectedOption: string,
    context: string[],
  ): Promise<string> {
    // 기본 공감 코멘트 (API 키 없을 때 사용)
    const fallbackComments = [
      '그렇군요.',
      '네, 이해해요.',
      '말씀해주셔서 고마워요.',
      '그런 마음이 드셨군요.',
      '충분히 그럴 수 있어요.',
    ];

    if (!this.hasApiKey) {
      return fallbackComments[Math.floor(Math.random() * fallbackComments.length)];
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 따뜻한 심리 상담사입니다.
사용자가 선택한 내용에 대해 짧고 따뜻한 공감 코멘트를 해주세요.

규칙:
- 한 문장, 최대 20자 이내
- 부드럽고 수용적인 어조
- 판단하지 않음
- 예: "그랬군요.", "네, 알겠어요.", "그런 마음이 드셨군요."`,
        },
        {
          role: 'user',
          content: `사용자 선택: "${selectedOption}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    return response.choices[0].message.content || '네, 알겠어요.';
  }

  /**
   * "말하기 어려워요" 선택 시 현재까지 수집된 컨텍스트를 따뜻하게 요약
   */
  async summarizeContextForDifficultToTalk(context: string[]): Promise<string> {
    if (context.length === 0) {
      return '아직 나눈 이야기가 없어요. 천천히 시작해볼까요?';
    }

    if (!this.hasApiKey) {
      // API 키 없을 때 기본 요약
      const filtered = context.filter(
        (c) => !c.startsWith('[이전 상담') && !c.startsWith('상담사:'),
      );
      if (filtered.length === 0) {
        return '천천히 마음을 열어주셔서 감사해요.';
      }
      return `지금까지 "${filtered.slice(-3).join('", "')}" 라고 말씀해주셨어요. 말하기 어려우시면 괜찮아요. 천천히 해도 돼요.`;
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 따뜻한 심리 상담사입니다.
사용자가 "말하기 어려워요"를 선택했습니다.

현재까지 수집된 컨텍스트를 바탕으로:
1. 지금까지 사용자가 어떤 이야기를 나눴는지 부드럽게 요약해주세요
2. 말하기 어려운 마음을 공감하고 수용해주세요
3. 억지로 말하지 않아도 된다는 것을 전달해주세요

응답 형식:
- 2~3문장으로 짧게
- 따뜻하고 공감적인 어조
- "~하셨군요", "~인 것 같아요" 같은 부드러운 표현 사용`,
        },
        {
          role: 'user',
          content: `현재까지 대화 내용:\n${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || '말하기 어려우시면 괜찮아요. 천천히 해도 돼요.';
  }

  /**
   * 스트리밍 방식으로 응답 생성
   */
  async *generateResponseStream(
    context: string[],
    mode: ResponseMode,
    userMessage?: string,
  ): AsyncGenerator<string, void, unknown> {
    const modePrompts: Record<ResponseMode, string> = {
      comfort: `[위로 모드 - 공감과 정서적 지지]
목표: 내담자가 감정적으로 안전하다고 느끼게 하기

응답 구조:
1. 감정 반영: "~하셨군요", "~한 마음이 드셨겠어요"
2. 정서적 수용: "그런 상황에서 그렇게 느끼는 건 자연스러운 거예요"
3. 지지: "혼자 감당하느라 힘드셨을 거예요"

금지사항:
- 해결책 제시 금지
- "~해보세요" 같은 조언 금지
- 긍정적으로 생각하라는 말 금지`,

      organize: `[정리 모드 - 상황과 감정 분리]
목표: 복잡한 상황을 명확하게 구조화

응답 구조:
1. 상황 요약: "지금 상황을 정리해보면..."
2. 사실과 감정 분리: "일어난 일은 ~이고, 느끼신 감정은 ~인 것 같아요"
3. 핵심 포인트: "가장 마음에 걸리는 부분은 ~인 것 같네요"

금지사항:
- 판단하거나 평가 금지
- 누구 잘못인지 따지지 않기`,

      validate: `[검증 모드 - 감정의 타당성 확인]
목표: 내담자의 감정이 비정상이 아님을 확인

응답 구조:
1. 상황 인정: "그런 상황이었군요"
2. 감정 정상화: "그 상황에서 ~하게 느끼는 건 아주 자연스러운 반응이에요"
3. 보편성: "많은 사람들이 비슷한 상황에서 같은 감정을 느껴요"

다만 객관적으로 다른 시각도 있을 수 있다면:
"다만, ~한 관점도 있을 수 있어요. 하지만 지금 느끼는 감정 자체는 충분히 이해돼요"`,

      direction: `[방향 모드 - 작은 실천 제안]
목표: 실행 가능한 아주 작은 행동 1개 제안

응답 구조:
1. 상황 공감: 먼저 공감 표현
2. 작은 제안: "오늘 하루, 딱 하나만 해보는 건 어떨까요?"
3. 구체적 행동: 5분 이내에 할 수 있는 아주 작은 행동
4. 선택권 부여: "물론 안 하셔도 괜찮아요"

금지사항:
- 거창한 목표 금지
- 인생을 바꾸는 조언 금지
- 여러 개 제안 금지`,

      listen: `[경청 모드 - 최소 개입]
목표: 내담자가 자유롭게 이야기할 수 있는 공간 제공

응답 구조:
1. 짧은 반응: "네", "그랬군요", "계속 들을게요"
2. 열린 질문(선택적): "더 이야기해주실 수 있을까요?"

금지사항:
- 긴 응답 금지
- 분석이나 해석 금지
- 조언 금지`,

      similar: `[사례 모드 - 유사 경험 공유]
목표: 혼자가 아님을 느끼게 하기

응답 구조:
1. 공감: "그런 경험을 하고 계시는군요"
2. 보편성: "비슷한 고민을 하는 분들이 많아요"
3. 익명 사례: "어떤 분은 ~한 상황에서 ~하게 느꼈다고 해요"
4. 연결: "혼자만의 고민이 아니에요"

주의: 실제 사례가 아닌 일반화된 경험 공유`,
    };

    if (!this.hasApiKey) {
      const fallback = this.getFallbackResponse(mode, context);
      yield fallback;
      return;
    }

    const systemPrompt = `당신은 따뜻하고 전문적인 심리 상담사입니다.

상담 원칙:
- 무조건적 긍정적 존중
- 비판단적 태도
- 내담자 페이스 존중

${modePrompts[mode]}

응답 길이: 150-250자
말투: 부드럽고 따뜻하게, 존댓말 사용`;

    const userPrompt = `내담자 상담 기록:
${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${userMessage ? `내담자의 추가 메시지: "${userMessage}"` : '첫 응답을 해주세요.'}`;

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
