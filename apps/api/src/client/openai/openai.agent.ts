import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  CATEGORY_CONTEXTS,
  INITIAL_QUESTION_HINTS,
  INITIAL_QUESTIONS,
  INITIAL_OPTIONS,
  COUNSELOR_TYPE_PROMPTS,
  RESPONSE_MODE_PROMPTS,
  RESPONSE_MODE_FALLBACKS,
  PROMPT_CONFIG,
  QUESTION_DEPTH_GUIDE,
  GENERATE_OPTIONS_SYSTEM_PROMPT,
  GENERATE_RESPONSE_SYSTEM_PROMPT,
  EMPATHY_COMMENT_PROMPT,
  CONTEXT_SUMMARY_PROMPT,
  SESSION_SUMMARY_PROMPT,
  ROLLING_SUMMARY_PROMPT,
  EXTRACT_USER_PROFILE_PROMPT,
  COUNSELOR_MODE_PROMPTS,
  COUNSELOR_MODE_OPTIONS_PROMPTS,
  IMPORT_TEXT_SUMMARY_PROMPT,
  getCategoryExpertise,
} from '../../prompts';
import { GenerateOptionsResult } from '../../types/chat';
import { Category, CounselorType, ResponseMode } from '../../types/session';

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

  // 의미없는 짧은 입력 패턴
  private readonly MEANINGLESS_PATTERNS = /^(ㄷㄷ+|ㅋㅋ+|ㅎㅎ+|ㅇㅇ+|ㄴㄴ+|ㅇㅋ|ㅇㅇㅇ|응+|어+|음+|아+|오+|ㅠㅠ+|ㅜㅜ+|\.+|\?+|ㅁㅁ|;;+|ㄱㄱ|ㅃㅃ|ㄹㅇ|ㅈㅈ)$/;

  // 의미없는 입력인지 확인
  private isMeaninglessInput(input: string): boolean {
    const trimmed = input.trim();
    return trimmed.length <= 5 && this.MEANINGLESS_PATTERNS.test(trimmed);
  }

  async generateOptions(
    context: string[],
    currentStep: string,
    category?: Category,
    counselorType?: CounselorType,
  ): Promise<GenerateOptionsResult> {
    const contextCount = context.length;
    const categoryContext = category ? CATEGORY_CONTEXTS[category] : '';
    const questionHint =
      category && currentStep === 'initial'
        ? INITIAL_QUESTION_HINTS[category]
        : '';

    // 피드백 요청 가능 여부
    const canRequestFeedback = contextCount >= PROMPT_CONFIG.MIN_CONTEXT_FOR_FEEDBACK;

    // 첫 질문일 때는 API 호출 없이 미리 정의된 질문/선택지 사용 (토큰 절약 + 빠른 응답)
    if (currentStep === 'initial' && category && contextCount === 0) {
      return {
        question: INITIAL_QUESTIONS[category],
        options: INITIAL_OPTIONS[category],
        canProceedToResponse: false,
        canRequestFeedback: true, // 항상 피드백 가능
      };
    }

    // 마지막 입력이 의미없는 짧은 입력이면 API 호출 없이 바로 응답 (토큰 절약)
    const lastInput = context[context.length - 1];
    if (lastInput && this.isMeaninglessInput(lastInput)) {
      // 모드별 기본 응답
      if (counselorType?.startsWith('listening-')) {
        return {
          question: '네...',
          options: ['더 말할게요', '여기까지만요'],
          canProceedToResponse: contextCount >= PROMPT_CONFIG.MIN_CONTEXT_FOR_RESPONSE,
          canRequestFeedback,
        };
      }
      if (counselorType?.startsWith('reaction-')) {
        return {
          question: '네네',
          options: ['그래서 말인데요', '다른 얘기할게요', '글쎄요...'],
          canProceedToResponse: contextCount >= PROMPT_CONFIG.MIN_CONTEXT_FOR_RESPONSE,
          canRequestFeedback,
        };
      }
      return {
        question: '괜찮아요. 말로 하기 어려우시면 아래 버튼으로 선택해주셔도 돼요.',
        options: ['조금 더 생각해볼게', '다른 얘기할래', '잘 모르겠어'],
        canProceedToResponse: contextCount >= PROMPT_CONFIG.MIN_CONTEXT_FOR_RESPONSE,
        canRequestFeedback,
      };
    }

    // API 키가 없으면 기본 응답 반환
    if (!this.hasApiKey) {
      return {
        question: '말씀해주셔서 감사해요. 조금 더 이야기해주실 수 있을까요?',
        options: ['네, 더 말할게요', '이 정도면 충분해요', '잘 모르겠어요'],
        canProceedToResponse: contextCount >= 3,
        canRequestFeedback,
      };
    }

    // 모드별 프롬프트 추가
    const modePrompt = counselorType ? COUNSELOR_MODE_PROMPTS[counselorType] : '';
    const modeOptionsPrompt = counselorType ? COUNSELOR_MODE_OPTIONS_PROMPTS[counselorType] : '';

    // 카테고리별 전문 프롬프트 추가
    const categoryExpertise = getCategoryExpertise(category);

    // 턴 수 계산 (사용자 입력 수 기준)
    const userTurnCount = context.filter(c => c.startsWith('나:')).length;

    // 마지막 사용자 입력에서 조언 요청 감지
    const userInputs = context.filter(c => c.startsWith('나:'));
    const lastUserInput = userInputs[userInputs.length - 1] || '';
    const adviceRequestKeywords = ['조언', '정리해', '어떻게 하면', '어떻게 해야', '알려줘', '도와줘', '네 생각', '좋을까'];
    const isAdviceRequested = adviceRequestKeywords.some(keyword => lastUserInput.includes(keyword));

    // 디버깅 로그
    console.log('[generateOptions] lastUserInput:', lastUserInput);
    console.log('[generateOptions] isAdviceRequested:', isAdviceRequested);

    // 조언 모드: 3턴 이상이거나 명시적 조언 요청 시
    const shouldGiveAdvice = userTurnCount >= PROMPT_CONFIG.MIN_TURNS_FOR_ADVICE || isAdviceRequested;

    // 조언 모드 강제 프롬프트
    const adviceModePrompt = shouldGiveAdvice
      ? `\n\n[⚠️ 조언 모드 - 최우선 필수]
사용자가 조언을 요청했습니다. 반드시 다음을 지키세요:

1. 절대 질문하지 마세요 (물음표 ? 사용 금지)
2. "~해보세요", "~하시면 좋겠어요" 같은 조언으로 끝내세요
3. 구체적인 행동 제안을 번호 리스트로 제공하세요

[좋은 예시]
"지금 상황에서 이렇게 해보시면 어떨까요.

1. 매일 아침 5분간 오늘의 우선순위 3가지를 적어보세요
2. 점심 후 10분간 가벼운 산책을 해보세요
3. 하루를 마무리하며 잘한 일 하나를 떠올려 보세요"

[나쁜 예시 - 절대 금지]
"어떤 것부터 시작해보실 건가요?"
"그렇게 느끼시는 이유가 있을까요?"`
      : '';

    const systemPrompt = `${GENERATE_OPTIONS_SYSTEM_PROMPT}

${modePrompt}

${modeOptionsPrompt}

${categoryContext}

${categoryExpertise}

${QUESTION_DEPTH_GUIDE}
${adviceModePrompt}

현재 수집된 컨텍스트 수: ${contextCount}개
${questionHint ? `상황: ${questionHint}` : ''}`;

    const userPrompt =
      contextCount === 0
        ? `사용자가 "${category}" 카테고리를 선택했습니다. 첫 질문을 생성해주세요.`
        : `현재까지 대화 흐름:
${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}

현재 단계: ${currentStep}
${isAdviceRequested ? '⚠️ 사용자가 조언을 요청했습니다. 질문하지 말고 구체적인 조언만 제공하세요.' : '사용자의 마지막 선택/입력에 공감하면서 다음 질문과 선택지를 생성해주세요.'}`;

    const response = await this.openai.chat.completions.create(
      {
        model: PROMPT_CONFIG.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: PROMPT_CONFIG.TEMPERATURE_OPTIONS,
      },
      {
        timeout: 60000, // 60초 타임아웃
      }
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // 질문 필터링 로직
    let question = result.question || '';

    // 조언 모드 (3턴 이상)에서 질문으로 끝나면 질문 부분 제거
    if (shouldGiveAdvice && question.trim().endsWith('?')) {
      const sentences = question.split(/(?<=[.!?])\s*/);
      const nonQuestionSentences = sentences.filter((s: string) => !s.trim().endsWith('?'));

      if (nonQuestionSentences.length > 0) {
        question = nonQuestionSentences.join(' ').trim();
      } else {
        // 전부 질문이면 조언 요청 메시지로 대체
        question = '지금까지 말씀해주신 내용을 잘 들었어요. 제 생각을 말씀드릴게요.';
      }
    } else {
      // 기존 로직: 5회 이상 연속 질문 방지
      const recentAiResponses = context
        .filter(c => c.startsWith('상담사:') || c.startsWith('상담사: '))
        .slice(-4); // 최근 4개 AI 응답

      const allQuestionsRecently = recentAiResponses.length >= 4 &&
        recentAiResponses.every(r => r.includes('?'));

      // 이번 응답도 질문으로 끝나고, 최근 4개가 모두 질문이면 → 질문 제거
      if (allQuestionsRecently && question.trim().endsWith('?')) {
        const sentences = question.split(/(?<=[.!?])\s*/);
        const nonQuestionSentences = sentences.filter((s: string) => !s.trim().endsWith('?'));

        if (nonQuestionSentences.length > 0) {
          question = nonQuestionSentences.join(' ').trim();
        } else {
          question = '네, 잘 들었어요. 천천히 이야기해주세요.';
        }
      }
    }

    // 옵션에 "조언해줘" 관련 버튼이 없으면 강제 추가
    let options: string[] = result.options || [];
    const adviceKeywords = ['조언', '정리', '해줘', '알려줘', '도와줘', '방법', '어떻게'];
    const hasAdviceOption = options.some((opt: string) =>
      adviceKeywords.some(keyword => opt.includes(keyword))
    );

    // 컨텍스트가 2턴 이상이고, 조언 관련 옵션이 없으면 마지막 옵션을 대체
    if (contextCount >= 2 && !hasAdviceOption && options.length > 0) {
      // 조언 요청 옵션 목록 (상황에 맞게 랜덤 선택)
      const adviceOptions = [
        '조언해줘',
        '정리해줘',
        '어떻게 하면 좋을까',
        '네 생각을 말해줘',
      ];
      const randomAdvice = adviceOptions[Math.floor(Math.random() * adviceOptions.length)];
      // 마지막 옵션을 조언 요청으로 대체
      options = [...options.slice(0, -1), randomAdvice];
    }

    return {
      ...result,
      question,
      options,
      canRequestFeedback,
    };
  }

  async generateResponse(
    context: string[],
    mode: ResponseMode,
    userMessage?: string,
    counselorType?: CounselorType,
  ): Promise<string> {
    if (!this.hasApiKey) {
      return this.getFallbackResponse(mode, counselorType);
    }

    // 상담가 유형이 선택된 경우 해당 프롬프트 사용, 아니면 기존 mode 프롬프트 사용
    const stylePrompt = counselorType
      ? COUNSELOR_TYPE_PROMPTS[counselorType]
      : RESPONSE_MODE_PROMPTS[mode];

    const systemPrompt = `${GENERATE_RESPONSE_SYSTEM_PROMPT}

${stylePrompt}`;

    const userPrompt = `내담자 상담 기록:
${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${userMessage ? `내담자의 추가 메시지: "${userMessage}"` : '첫 응답을 해주세요.'}`;

    const response = await this.openai.chat.completions.create({
      model: PROMPT_CONFIG.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: PROMPT_CONFIG.TEMPERATURE_RESPONSE,
    });

    return response.choices[0].message.content || '';
  }

  private getFallbackResponse(mode: ResponseMode, counselorType?: CounselorType): string {
    // 상담가 유형별 기본 응답
    if (counselorType) {
      const counselorFallbacks: Record<CounselorType, string> = {
        T: '상황을 정리해보면, 지금 겪고 계신 일이 복잡하게 느껴지실 수 있어요. 하나씩 객관적으로 살펴보면서 해결책을 찾아가면 어떨까요?',
        F: '말씀해주셔서 감사해요. 그런 상황에서 그렇게 느끼시는 건 정말 자연스러운 거예요. 혼자 감당하느라 많이 힘드셨을 거예요. 제가 함께할게요.',
        'reaction-bright': '아 그러셨군요... 정말요? 아이고...',
        'reaction-calm': '아 그러셨군요... 정말요? 아이고...',
        'listening-quiet': '네... 그러셨군요.',
        'listening-active': '네... 그러셨군요.',
      };
      return counselorFallbacks[counselorType];
    }

    return RESPONSE_MODE_FALLBACKS[mode];
  }

  async summarizeSession(context: string[]): Promise<string> {
    if (!this.hasApiKey) {
      const keywords = context.slice(0, 3).join(', ');
      return `상담 주제: ${keywords}`;
    }

    const response = await this.openai.chat.completions.create({
      model: PROMPT_CONFIG.MODEL,
      messages: [
        { role: 'system', content: SESSION_SUMMARY_PROMPT },
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

    // 의미없는 입력이면 API 호출 없이 바로 응답 (토큰 절약)
    if (this.isMeaninglessInput(selectedOption)) {
      return '네, 알겠어요.';
    }

    if (!this.hasApiKey) {
      return fallbackComments[Math.floor(Math.random() * fallbackComments.length)];
    }

    const response = await this.openai.chat.completions.create({
      model: PROMPT_CONFIG.MODEL,
      messages: [
        { role: 'system', content: EMPATHY_COMMENT_PROMPT },
        { role: 'user', content: `사용자 선택: "${selectedOption}"` },
      ],
      temperature: PROMPT_CONFIG.TEMPERATURE_EMPATHY,
      max_tokens: 50,
    });

    return response.choices[0].message.content || '네, 알겠어요.';
  }

  /**
   * 상담가 유형에 따른 피드백 생성 (경청모드 제외)
   * 선택 시 공감 코멘트와 함께 상담가 의견을 제공
   */
  async generateCounselorFeedback(
    selectedOption: string,
    context: string[],
    counselorType: CounselorType,
  ): Promise<string> {
    // 경청모드는 피드백 제공하지 않음
    if (counselorType?.startsWith('listening-')) {
      return '';
    }

    // 컨텍스트가 충분하지 않으면 피드백 생성하지 않음 (최소 2턴)
    if (context.length < 2) {
      return '';
    }

    // 기본 피드백 (API 키 없을 때)
    const fallbackFeedbacks: Partial<Record<CounselorType, string>> = {
      T: '상황을 정리해보면, 지금 겪고 계신 상황이 조금 복잡해 보여요. 핵심을 하나씩 풀어가면 좋을 것 같아요.',
      F: '많이 힘드셨겠어요. 그런 마음이 드는 건 충분히 자연스러운 거예요. 혼자 감당하지 않으셔도 돼요.',
      'reaction-bright': '아... 그런 일이 있으셨군요.',
      'reaction-calm': '아... 그런 일이 있으셨군요.',
    };

    if (!this.hasApiKey) {
      return fallbackFeedbacks[counselorType] || '';
    }

    const counselorPrompt = COUNSELOR_TYPE_PROMPTS[counselorType];

    const response = await this.openai.chat.completions.create({
      model: PROMPT_CONFIG.MODEL,
      messages: [
        {
          role: 'system',
          content: `${counselorPrompt}

사용자가 이야기한 내용에 대해 상담가로서 간단한 의견이나 생각을 제시해주세요.
- 2~3문장으로 짧게
- 질문하지 않기
- 상담가 유형에 맞는 스타일로`,
        },
        {
          role: 'user',
          content: `현재까지 대화:
${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}

마지막 사용자 선택: "${selectedOption}"

상담가로서 짧게 의견을 제시해주세요.`,
        },
      ],
      temperature: PROMPT_CONFIG.TEMPERATURE_RESPONSE,
      max_tokens: 150,
    });

    return response.choices[0].message.content || '';
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
      model: PROMPT_CONFIG.MODEL,
      messages: [
        { role: 'system', content: CONTEXT_SUMMARY_PROMPT },
        {
          role: 'user',
          content: `현재까지 대화 내용:\n${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
        },
      ],
      temperature: PROMPT_CONFIG.TEMPERATURE_EMPATHY,
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
    counselorType?: CounselorType,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.hasApiKey) {
      const fallback = this.getFallbackResponse(mode, counselorType);
      yield fallback;
      return;
    }

    // 상담가 유형이 선택된 경우 해당 프롬프트 사용, 아니면 기존 mode 프롬프트 사용
    const stylePrompt = counselorType
      ? COUNSELOR_TYPE_PROMPTS[counselorType]
      : RESPONSE_MODE_PROMPTS[mode];

    const systemPrompt = `${GENERATE_RESPONSE_SYSTEM_PROMPT}

${stylePrompt}`;

    const userPrompt = `내담자 상담 기록:
${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${userMessage ? `내담자의 추가 메시지: "${userMessage}"` : '첫 응답을 해주세요.'}`;

    const stream = await this.openai.chat.completions.create({
      model: PROMPT_CONFIG.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: PROMPT_CONFIG.TEMPERATURE_RESPONSE,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * 롤링 요약 생성 (오래된 대화 요약)
   */
  async generateRollingSummary(
    existingSummary: string,
    contextToSummarize: string[],
  ): Promise<string> {
    if (!this.hasApiKey) {
      // API 키 없을 때 간단한 요약
      return contextToSummarize.slice(-5).join(' / ');
    }

    const userPrompt = existingSummary
      ? `기존 요약:\n${existingSummary}\n\n추가된 대화:\n${contextToSummarize.join('\n')}\n\n기존 요약에 추가된 대화 내용을 통합하여 새로운 요약을 작성하세요.`
      : `대화 내용:\n${contextToSummarize.join('\n')}`;

    const response = await this.openai.chat.completions.create({
      model: PROMPT_CONFIG.MODEL,
      messages: [
        { role: 'system', content: ROLLING_SUMMARY_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    });

    return response.choices[0].message.content || existingSummary;
  }

  /**
   * 사용자 프로필 정보 추출
   */
  async extractUserProfile(
    context: string[],
  ): Promise<{ emotions: string[]; topics: string[]; importantContext: string[] }> {
    if (!this.hasApiKey) {
      return { emotions: [], topics: [], importantContext: [] };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: PROMPT_CONFIG.MODEL,
        messages: [
          { role: 'system', content: EXTRACT_USER_PROFILE_PROMPT },
          { role: 'user', content: `대화 내용:\n${context.join('\n')}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        emotions: result.emotions || [],
        topics: result.topics || [],
        importantContext: result.importantContext || [],
      };
    } catch {
      return { emotions: [], topics: [], importantContext: [] };
    }
  }

  /**
   * 이전 상담 텍스트 요약 (불러오기 기능)
   * 긴 텍스트(최대 10,000자)에서 상담에 필요한 핵심 정보 추출
   */
  async summarizeImportedText(text: string): Promise<string> {
    if (!this.hasApiKey) {
      // API 키 없을 때 처음 500자만 반환
      return text.slice(0, 500);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: PROMPT_CONFIG.MODEL,
        messages: [
          { role: 'system', content: IMPORT_TEXT_SUMMARY_PROMPT },
          { role: 'user', content: `이전 상담 내용:\n${text}` },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return response.choices[0].message.content || text.slice(0, 500);
    } catch (error) {
      console.error('summarizeImportedText error:', error);
      // 오류 시 처음 500자만 반환
      return text.slice(0, 500);
    }
  }

  /**
   * 세션 이름 자동 생성 (대화 내용 기반)
   * 15자 이내의 간결한 세션 이름 생성
   */
  async generateSessionName(context: string[]): Promise<string> {
    if (!this.hasApiKey || context.length === 0) {
      return '';
    }

    try {
      // 최근 대화만 사용 (토큰 절약)
      const recentContext = context.slice(-5);

      const response = await this.openai.chat.completions.create({
        model: PROMPT_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `당신은 상담 세션의 이름을 짓는 역할입니다.
대화 내용을 보고 핵심 주제를 파악하여 15자 이내의 간결하고 따뜻한 세션 이름을 만들어주세요.

규칙:
- 15자 이내로 작성
- 핵심 감정이나 상황을 담을 것
- "~이야기", "~고민", "~마음" 같은 자연스러운 표현 사용
- 이모지는 사용하지 않음
- 따옴표 없이 이름만 출력

예시:
- 직장 스트레스 이야기
- 친구와 다툰 마음
- 미래에 대한 고민
- 가족 관계 이야기`,
          },
          {
            role: 'user',
            content: `대화 내용:\n${recentContext.join('\n')}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 30,
      });

      const name = response.choices[0].message.content?.trim() || '';
      // 15자 초과 시 자르기
      return name.slice(0, 15);
    } catch (error) {
      console.error('generateSessionName error:', error);
      return '';
    }
  }
}
