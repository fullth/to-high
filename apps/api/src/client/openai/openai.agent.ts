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
  relationship: `주제: 인간관계 고민 (친구, 가족, 연인)
탐색 방향: 관계 유형, 갈등 상황, 감정, 기대와 현실의 차이`,
};

const INITIAL_QUESTIONS: Record<Category, GenerateOptionsResult> = {
  self: {
    question: '요즘 나 자신에 대해 어떤 생각이 드시나요?',
    options: [
      '뭔가 부족한 것 같아',
      '불안하고 걱정이 많아',
      '의욕이 없고 무기력해',
      '나를 잘 모르겠어',
    ],
    canProceedToResponse: false,
  },
  future: {
    question: '미래에 대해 어떤 부분이 가장 마음에 걸리세요?',
    options: [
      '뭘 해야 할지 모르겠어',
      '선택을 못하겠어',
      '불안하고 막막해',
      '목표가 없는 것 같아',
    ],
    canProceedToResponse: false,
  },
  work: {
    question: '직장에서 요즘 어떤 점이 힘드세요?',
    options: [
      '업무가 너무 많아',
      '사람들과의 관계가 힘들어',
      '의미를 못 느끼겠어',
      '지쳐서 그만두고 싶어',
    ],
    canProceedToResponse: false,
  },
  relationship: {
    question: '어떤 관계에서 힘드신 건가요?',
    options: ['가족', '친구', '연인', '직장 동료'],
    canProceedToResponse: false,
  },
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

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateOptions(
    context: string[],
    currentStep: string,
    category?: Category,
  ): Promise<GenerateOptionsResult> {
    if (currentStep === 'initial' && category && INITIAL_QUESTIONS[category]) {
      return INITIAL_QUESTIONS[category];
    }

    const categoryContext = category ? CATEGORY_CONTEXTS[category] : '';
    const contextCount = context.length;

    const systemPrompt = `당신은 내담자 중심 상담(Person-Centered Therapy) 원칙을 따르는 상담 도우미입니다.

핵심 원칙:
1. 무조건적 긍정적 존중: 판단하지 않고 있는 그대로 수용
2. 공감적 이해: 내담자의 관점에서 경험을 이해
3. 진정성: 따뜻하고 진실된 태도

${categoryContext}

${QUESTION_DEPTH_GUIDE}

현재 수집된 컨텍스트 수: ${contextCount}개

선택지 작성 규칙:
- 3~4개의 선택지 제공
- 각 선택지는 15자 이내로 짧고 명확하게
- "기타" 또는 "말하기 어려워요" 같은 회피 선택지 1개 포함
- 감정을 강요하지 않고, 선택의 자유 존중
- 이전 선택과 자연스럽게 연결되는 질문

JSON 형식으로만 응답:
{
  "question": "따뜻한 어조의 질문",
  "options": ["선택지1", "선택지2", "선택지3", "말하기 어려워요"],
  "canProceedToResponse": false
}`;

    const userPrompt = `현재까지 대화 흐름:
${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}

현재 단계: ${currentStep}
다음 질문과 선택지를 생성해주세요.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
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

  async summarizeSession(context: string[]): Promise<string> {
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
}
