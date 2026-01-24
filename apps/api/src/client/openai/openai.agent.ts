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
      if (counselorType === 'listening') {
        return {
          question: '네...',
          options: ['더 말할게요', '여기까지만요'],
          canProceedToResponse: contextCount >= PROMPT_CONFIG.MIN_CONTEXT_FOR_RESPONSE,
          canRequestFeedback,
        };
      }
      if (counselorType === 'reaction') {
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

    const systemPrompt = `${GENERATE_OPTIONS_SYSTEM_PROMPT}

${modePrompt}

${modeOptionsPrompt}

${categoryContext}

${QUESTION_DEPTH_GUIDE}

현재 수집된 컨텍스트 수: ${contextCount}개
${questionHint ? `상황: ${questionHint}` : ''}`;

    const userPrompt =
      contextCount === 0
        ? `사용자가 "${category}" 카테고리를 선택했습니다. 첫 질문을 생성해주세요.`
        : `현재까지 대화 흐름:
${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}

현재 단계: ${currentStep}
사용자의 마지막 선택/입력에 공감하면서 다음 질문과 선택지를 생성해주세요.`;

    const response = await this.openai.chat.completions.create({
      model: PROMPT_CONFIG.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: PROMPT_CONFIG.TEMPERATURE_OPTIONS,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      ...result,
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
        reaction: '아 그러셨군요... 정말요? 아이고...',
        listening: '네... 그러셨군요.',
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
}
