import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { CHAT_LIMITS } from '../../common/chat-limits';
import {
  OffTopicRequestReason,
  detectOffTopicRequest,
} from '../../common/chat-scope-guard';
import {
  CostGuardReason,
  detectCostGuardReason,
} from '../../common/chat-input-guard';
import { ChatRequestLimitService } from '../../common/chat-request-limit.service';
import { detectCrisis } from '../../common/crisis-detector';
import { SessionRepository } from '../../persistence/session/session.repository';
import { UserRepository } from '../../persistence/user/user.repository';
import { UserProfileRepository } from '../../persistence/user-profile/user-profile.repository';
import { RESPONSE_MODE_OPTIONS, buildSessionPreview } from '../../types/chat';
import { Category, CounselorType, ResponseMode } from '../../types/session';
import { SessionService } from '../session/session.service';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
} from '../../database/payment.schema';
import type {
  SessionListItem,
  SessionDetailResponse,
} from '../../controller/chat/dto/chat.response';
import {
  INITIAL_OPTIONS,
  INITIAL_QUESTIONS,
  PROMPT_CONFIG,
} from '../../prompts';

// 무료 사용자 세션 제한
const FREE_USER_SESSION_LIMIT = 3;

// 무료-우선 런칭 단계 플래그.
// true이면 세션 한도(paywall)를 적용하지 않고 모두 무제한 무료로 개방한다.
// 구독/결제를 재개할 때 false로 되돌리면 아래 한도 로직(무료 3권 + 구독 티어)이
// 그대로 복원된다. (구독 시스템 자체는 subscribe 페이지에 '준비중'으로 유지)
const FREE_LAUNCH_MODE: boolean = true;

const OFF_TOPIC_REPLY =
  '위로는 마음과 감정에 관한 이야기만 함께할 수 있어요. 이 요청 때문에 든 마음을 이야기해 주세요.';
const MEDICAL_ADVICE_REPLY =
  '진단이나 약물 복용, 중단, 용량 변경은 도와드릴 수 없어요. 자격 있는 의료 전문가와 상의해 주세요.';

@Injectable()
export class ChatService {
  constructor(
    private sessionService: SessionService,
    private sessionRepository: SessionRepository,
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository,
    private openaiAgent: OpenAIAgent,
    private chatRequestLimitService: ChatRequestLimitService,
  ) {}

  private assertSessionAccess(
    session: { userId: { toString(): string }; isGuest?: boolean },
    userId: string,
  ): void {
    const canAccess =
      userId === 'anonymous'
        ? session.isGuest === true
        : session.userId.toString() === userId;
    if (!canAccess) {
      throw new NotFoundException('이야기를 찾을 수 없어요');
    }
  }

  // 입력 길이 검증
  private validateInput(input: string): void {
    if (!input.trim()) {
      throw new BadRequestException('내용을 입력해 주세요.');
    }
    if (input.length > CHAT_LIMITS.inputLength) {
      throw new BadRequestException(
        `입력이 너무 길어요. ${CHAT_LIMITS.inputLength}자 이내로 작성해 주세요.`,
      );
    }
  }

  /**
   * 텍스트 요약 (세션 생성 전 미리보기용)
   */
  async summarizeText(text: string): Promise<string> {
    if (!text.trim() || text.length > CHAT_LIMITS.importTextLength) {
      throw new BadRequestException(
        `입력은 ${CHAT_LIMITS.importTextLength}자 이내로 작성해 주세요.`,
      );
    }

    // 위기 표현은 상담 범위 판정보다 항상 먼저 처리한다.
    const crisisResult = detectCrisis(text);
    if (crisisResult.isCrisis) {
      throw new BadRequestException({
        code: 'CRISIS_DETECTED',
        message: crisisResult.recommendedAction,
      });
    }
    const offTopicReason = detectOffTopicRequest(text);
    if (offTopicReason) {
      throw new BadRequestException(
        this.getScopeReply(offTopicReason).question,
      );
    }
    return this.openaiAgent.summarizeImportedText(text);
  }

  // 세션 대화 수 검증
  private validateContextCount(turnCount: number): void {
    if (turnCount >= CHAT_LIMITS.sessionTurns) {
      throw new BadRequestException(
        '이야기 한도에 도달했어요. 새 이야기를 시작해 주세요.',
      );
    }
  }

  private getCostGuardReply(reason: CostGuardReason): {
    question: string;
    options: string[];
  } {
    if (reason === 'repeated') {
      return {
        question:
          '같은 이야기가 이어지고 있어요. 지금 마음에서 달라진 점을 조금만 더 알려주세요.',
        options: [
          '조금 달라졌어요',
          '그대로 힘들어요',
          '더 심해졌어요',
          '조금 나아졌어요',
          '다른 감정이에요',
          '다른 이야기예요',
          '여기까지 할게요',
          '정리해주세요',
        ],
      };
    }
    return {
      question: '괜찮아요. 짧게라도 지금 마음에 가장 가까운 말을 골라주세요.',
      options: [
        '힘들어요',
        '답답해요',
        '불안해요',
        '슬퍼요',
        '화가 나요',
        '잘 모르겠어요',
        '다른 이야기예요',
        '정리해주세요',
      ],
    };
  }

  private getScopeReply(reason: OffTopicRequestReason): {
    question: string;
    options: string[];
  } {
    return {
      question:
        reason === 'medical-advice' ? MEDICAL_ADVICE_REPLY : OFF_TOPIC_REPLY,
      options: [
        '이 일로 불안해요',
        '마음이 답답해요',
        '자신감이 떨어져요',
        '화가 나요',
        '속상해요',
        '부담스러워요',
        '다른 고민이 있어요',
        '정리해주세요',
      ],
    };
  }

  async startSession(
    userId: string,
    category?: Category,
    initialText?: string,
    counselorType?: CounselorType,
    importSummary?: string,
  ) {
    if (initialText) {
      this.validateInput(initialText);
    }
    if (
      importSummary &&
      (!importSummary.trim() ||
        importSummary.length > CHAT_LIMITS.importSummaryLength)
    ) {
      throw new BadRequestException(
        `불러오기 요약은 ${CHAT_LIMITS.importSummaryLength}자 이내로 작성해 주세요.`,
      );
    }

    const suppliedInputs = [initialText, importSummary].filter(
      (input): input is string => !!input,
    );
    // 위기 판정은 범위 판정과 세션 생성보다 항상 먼저 수행한다.
    const initialCrisisEntry = suppliedInputs
      .map((input) => ({ input, result: detectCrisis(input) }))
      .find(({ result }) => result.isCrisis);
    const initialCrisis = initialCrisisEntry?.result ?? null;
    const offTopicReason = initialCrisis
      ? null
      : suppliedInputs
          .map(detectOffTopicRequest)
          .find((reason) => reason !== null);
    if (offTopicReason) {
      // 세션 생성과 원문 저장 전에 거부해 DB 및 후속 프롬프트 비용을 막는다.
      throw new BadRequestException(
        this.getScopeReply(offTopicReason).question,
      );
    }

    // 세션 제한 체크 (무료-우선 런칭 동안 FREE_LAUNCH_MODE로 비활성화)
    if (!FREE_LAUNCH_MODE && userId !== 'anonymous') {
      const user = await this.userRepository.findById(userId);

      // 레거시 사용자는 무제한
      if (user?.isGrandfathered) {
        // 무제한 이용 가능
      } else {
        const sessionCount =
          await this.sessionRepository.countUserSessions(userId);

        // 구독자인 경우 구독 티어에 따른 제한
        if (user?.isSubscribed && user?.subscriptionTier) {
          const plan =
            SUBSCRIPTION_PLANS[user.subscriptionTier as SubscriptionTier];
          const limit = FREE_USER_SESSION_LIMIT + (plan?.sessionLimit || 0);

          if (sessionCount >= limit) {
            throw new ForbiddenException({
              code: 'SESSION_LIMIT_EXCEEDED',
              message: '이번 달 이야기를 모두 사용했어요.',
              sessionCount,
              limit,
            });
          }
        } else {
          // 무료 사용자
          if (sessionCount >= FREE_USER_SESSION_LIMIT) {
            throw new ForbiddenException({
              code: 'SESSION_LIMIT_EXCEEDED',
              message:
                '이번 달 무료 이야기를 모두 사용했어요. 더 담고 싶다면 구독해 주세요.',
              sessionCount,
              limit: FREE_USER_SESSION_LIMIT,
            });
          }
        }
      }
    }

    let previousContext: string | undefined;
    let previousSessionSummary: string | undefined;

    if (userId !== 'anonymous') {
      const recentSummaries =
        await this.sessionRepository.getRecentSummaries(userId);
      if (recentSummaries.length > 0) {
        previousContext = recentSummaries
          .map((s) => `[이전 상담: ${s.category}] ${s.summary}`)
          .join('\n');

        // 사용자에게 보여줄 친근한 요약 생성
        const lastSession = recentSummaries[0];
        previousSessionSummary = lastSession.summary;
      }
    }

    // 직접 입력인 경우 'direct' 카테고리 사용
    const sessionCategory = category || 'direct';
    const session = await this.sessionService.create(
      userId,
      sessionCategory,
      counselorType,
    );

    if (previousContext) {
      await this.sessionService.addContext(
        session._id.toString(),
        `[이전 상담 기록]\n${previousContext}`,
      );
    }

    // 직접 입력 텍스트 또는 불러오기 요약이 있으면 컨텍스트에 추가
    if (initialCrisisEntry) {
      await this.sessionService.addContext(
        session._id.toString(),
        `[위기 감지: ${initialCrisisEntry.result.level}] ${initialCrisisEntry.input}`,
      );
    } else if (importSummary) {
      // 이미 요약된 불러오기 텍스트 (사용자가 확인/수정한 요약)
      await this.sessionService.addContext(
        session._id.toString(),
        `[이전 상담 불러오기 - 요약]\n${importSummary}`,
      );
    } else if (initialText) {
      await this.sessionService.addContext(
        session._id.toString(),
        `[사용자 직접 입력] ${initialText}`,
      );
    }

    const updatedSession =
      initialText || importSummary
        ? await this.sessionService.findById(session._id.toString())
        : session;

    let options;
    if (!initialText && !importSummary && category) {
      options = {
        question: INITIAL_QUESTIONS[category],
        options: INITIAL_OPTIONS[category],
        canProceedToResponse: false,
        canRequestFeedback: true,
      };
    } else if (initialCrisis?.isCrisis) {
      options = {
        question: initialCrisis.recommendedAction!,
        options: ['가까운 사람에게 연락할게요', '전문기관에 연락할게요'],
        canProceedToResponse: true,
        canRequestFeedback: true,
        isCrisis: true,
        crisisLevel: initialCrisis.level,
        crisisMessage: initialCrisis.recommendedAction,
      };
    } else {
      const costGuardReason = initialText
        ? detectCostGuardReason(initialText, [])
        : null;
      options = costGuardReason
        ? {
            ...this.getCostGuardReply(costGuardReason),
            canProceedToResponse: false,
            canRequestFeedback: true,
          }
        : await this.openaiAgent.generateOptions(
            updatedSession!.context,
            'collecting',
            sessionCategory,
            counselorType,
          );
    }

    return {
      sessionId: session._id,
      hasHistory: !!previousContext,
      previousSessionSummary,
      contextCount: updatedSession!.context.length,
      ...options,
      isCrisis: initialCrisis?.isCrisis || undefined,
      crisisLevel:
        initialCrisis?.level === 'medium' || initialCrisis?.level === 'high'
          ? initialCrisis.level
          : undefined,
      crisisMessage: initialCrisis?.isCrisis
        ? initialCrisis.recommendedAction
        : undefined,
    };
  }

  /**
   * "말하기 어려워요" 유형의 선택지인지 확인
   */
  private isDifficultToTalkOption(option: string): boolean {
    const patterns = [
      '말하기 어려워',
      '뭘 말해야 할지 모르겠',
      '정리가 안 돼',
      '잘 모르겠어',
      '뭐가 걱정인지 모르겠어',
    ];
    return patterns.some((pattern) => option.includes(pattern));
  }

  /**
   * "조언해주세요"/"정리해주세요" 등 조언(응답)을 요청하는 선택지인지 확인.
   * 매 턴의 8번째 선택지로 항상 제공되며, 선택 시 질문 루프를 멈추고
   * 응답 모드 선택 단계로 진입시킨다.
   */
  private isAdviceRequestOption(option: string): boolean {
    const t = option.trim();
    // "정리가 안 돼요"는 말하기 어려움 흐름이므로 제외
    if (this.isDifficultToTalkOption(t)) return false;
    return t.includes('조언') || t.includes('정리');
  }

  async *selectOptionStream(
    sessionId: string,
    selectedOption: string,
    signal?: AbortSignal,
    userId = 'anonymous',
  ) {
    const release = this.chatRequestLimitService.acquire(sessionId);
    try {
      yield* this.selectOptionStreamInternal(
        sessionId,
        selectedOption,
        signal,
        userId,
      );
    } finally {
      release();
    }
  }

  private async *selectOptionStreamInternal(
    sessionId: string,
    selectedOption: string,
    signal?: AbortSignal,
    userId = 'anonymous',
  ) {
    // 입력 검증
    this.validateInput(selectedOption);

    const session = await this.sessionService.findById(sessionId);
    if (!session) throw new NotFoundException('이야기를 찾을 수 없어요');
    this.assertSessionAccess(session, userId);

    const crisisResult = detectCrisis(selectedOption);
    if (crisisResult.isCrisis) {
      await this.sessionService.addContext(
        sessionId,
        `[위기 감지: ${crisisResult.level}] ${selectedOption}`,
      );

      yield {
        type: 'metadata',
        sessionId,
        isCrisis: true,
        crisisLevel: crisisResult.level,
        crisisMessage: crisisResult.recommendedAction,
        canProceedToResponse: true,
        canRequestFeedback: true,
        responseModes: RESPONSE_MODE_OPTIONS,
        contextCount: session.context.length + 1,
      };
      return;
    }

    const offTopicReason = detectOffTopicRequest(selectedOption);
    if (offTopicReason) {
      const fallback = this.getScopeReply(offTopicReason);
      yield {
        type: 'next',
        sessionId,
        ...fallback,
        canProceedToResponse: false,
        canRequestFeedback: true,
        contextCount: session.turnCount ?? session.context.length,
      };
      return;
    }

    // 위기 표현은 턴 한도나 저정보 입력 방어보다 항상 먼저 처리한다.
    this.validateContextCount(session.turnCount ?? session.context.length);

    const costGuardReason = detectCostGuardReason(
      selectedOption,
      session.fullContext ?? session.context,
    );
    if (costGuardReason) {
      await this.sessionService.addContext(sessionId, `나: ${selectedOption}`);
      const fallback = this.getCostGuardReply(costGuardReason);
      yield {
        type: 'next',
        sessionId,
        ...fallback,
        canProceedToResponse: false,
        canRequestFeedback: true,
        contextCount: (session.turnCount ?? session.context.length) + 1,
      };
      return;
    }

    // "말하기 어려워요" 유형 선택 시 컨텍스트 요약 제공
    if (this.isDifficultToTalkOption(selectedOption)) {
      const contextSummary =
        await this.openaiAgent.summarizeContextForDifficultToTalk(
          session.context,
        );

      await this.sessionService.addContext(
        sessionId,
        `[말하기 어려움 선택] ${selectedOption}`,
      );

      yield { type: 'contextSummary', content: contextSummary };

      const updatedSession = await this.sessionService.findById(sessionId);

      // 실시간 스트리밍으로 질문 생성
      let fullQuestion = '';
      let optionsResult: any = null;

      for await (const chunk of this.openaiAgent.generateOptionsStream(
        updatedSession!.context,
        'collecting',
        updatedSession!.category as Category,
        (updatedSession as any).counselorType as CounselorType,
      )) {
        if (signal?.aborted) return;
        if (chunk.type === 'question_chunk') {
          fullQuestion += chunk.content;
          yield { type: 'question_chunk', content: chunk.content };
        } else if (chunk.type === 'options') {
          optionsResult = chunk;
        }
      }

      yield {
        type: 'next',
        sessionId,
        question: fullQuestion,
        options: optionsResult.options,
        canProceedToResponse: optionsResult.canProceedToResponse,
        canRequestFeedback: optionsResult.canRequestFeedback,
        responseModes: optionsResult.canProceedToResponse
          ? RESPONSE_MODE_OPTIONS
          : undefined,
        contextCount: updatedSession!.context.length,
      };
      return;
    }

    // "조언해주세요"/"정리해주세요" 선택 시: 질문 루프를 멈추고 응답 모드 선택으로 전환
    if (this.isAdviceRequestOption(selectedOption)) {
      await this.sessionService.addContext(sessionId, `나: ${selectedOption}`);
      const advisedSession = await this.sessionService.findById(sessionId);
      yield {
        type: 'next',
        sessionId,
        question: '',
        options: [],
        canProceedToResponse: true,
        canRequestFeedback: true,
        responseModes: RESPONSE_MODE_OPTIONS,
        contextCount: advisedSession!.context.length,
      };
      return;
    }

    // 사용자 선택 저장 (나: 접두사 추가)
    await this.sessionService.addContext(sessionId, `나: ${selectedOption}`);

    const updatedSession = await this.sessionService.findById(sessionId);

    // 롤링 요약이 있으면 context 앞에 추가
    const rollingSummary = (updatedSession as any).rollingSummary || '';
    const contextForAI = rollingSummary
      ? [`[이전 대화 요약] ${rollingSummary}`, ...updatedSession!.context]
      : updatedSession!.context;

    // 실시간 스트리밍으로 질문 생성
    let fullQuestion = '';
    let optionsResult: any = null;

    for await (const chunk of this.openaiAgent.generateOptionsStream(
      contextForAI,
      'collecting',
      updatedSession!.category as Category,
      (updatedSession as any).counselorType as CounselorType,
    )) {
      if (signal?.aborted) return;
      if (chunk.type === 'question_chunk') {
        fullQuestion += chunk.content;
        yield { type: 'question_chunk', content: chunk.content };
      } else if (chunk.type === 'options') {
        optionsResult = chunk;
      }
    }

    // AI 응답(질문) 저장
    await this.sessionService.addContext(sessionId, `상담사: ${fullQuestion}`);

    // 롤링 요약: context가 20개 이상이면 오래된 것 요약
    const finalSession = await this.sessionService.findById(sessionId);
    if (finalSession && finalSession.context.length >= 20) {
      await this.performRollingSummary(sessionId, finalSession);
    }

    // 항상 question과 options를 보냄 (canProceedToResponse와 관계없이)
    yield {
      type: 'next',
      sessionId,
      question: fullQuestion,
      options: optionsResult.options,
      canProceedToResponse: optionsResult.canProceedToResponse,
      canRequestFeedback: optionsResult.canRequestFeedback,
      responseModes: optionsResult.canProceedToResponse
        ? RESPONSE_MODE_OPTIONS
        : undefined,
      contextCount: updatedSession!.context.length + 1,
    };
  }

  async endSession(sessionId: string, userId = 'anonymous') {
    const release = this.chatRequestLimitService.acquire(sessionId);
    try {
      const existingSession = await this.sessionService.findById(sessionId);
      if (!existingSession) {
        throw new NotFoundException('이야기를 찾을 수 없어요');
      }
      this.assertSessionAccess(existingSession, userId);
      if (existingSession.status === 'completed' && existingSession.summary) {
        return { summary: existingSession.summary };
      }
      const session = await this.sessionService.complete(sessionId);
      return { summary: session?.summary };
    } finally {
      release();
    }
  }

  /**
   * 스트리밍 방식으로 응답 모드 설정 및 응답 생성
   */
  async *setModeStream(
    sessionId: string,
    mode: ResponseMode,
    signal?: AbortSignal,
    userId = 'anonymous',
  ) {
    const release = this.chatRequestLimitService.acquire(sessionId);
    try {
      const session = await this.sessionService.findById(sessionId);
      if (!session) throw new NotFoundException('이야기를 찾을 수 없어요');
      this.assertSessionAccess(session, userId);
      if (session.context.length < PROMPT_CONFIG.MIN_CONTEXT_FOR_RESPONSE) {
        throw new BadRequestException(
          '마음을 조금 더 나눈 뒤 응답 방식을 선택해 주세요.',
        );
      }

      await this.sessionService.setResponseMode(sessionId, mode);

      // 세션 이름 자동 생성 (alias가 없을 경우)
      await this.tryGenerateSessionName(sessionId);

      yield* this.generateResponseStreamInternal(
        sessionId,
        undefined,
        signal,
        userId,
      );
    } finally {
      release();
    }
  }

  /**
   * 세션 이름 자동 생성 시도 (alias가 없고 context가 있을 때)
   * NOTE: generateSessionName이 제거되어 현재 비활성화
   */
  private async tryGenerateSessionName(_sessionId: string): Promise<void> {
    // generateSessionName 메서드가 제거되어 자동 이름 생성 비활성화
  }

  /**
   * 스트리밍 방식으로 응답 생성
   */
  async *generateResponseStream(
    sessionId: string,
    userMessage?: string,
    signal?: AbortSignal,
    userId = 'anonymous',
  ) {
    const release = this.chatRequestLimitService.acquire(sessionId);
    try {
      yield* this.generateResponseStreamInternal(
        sessionId,
        userMessage,
        signal,
        userId,
      );
    } finally {
      release();
    }
  }

  private async *generateResponseStreamInternal(
    sessionId: string,
    userMessage?: string,
    signal?: AbortSignal,
    userId = 'anonymous',
  ) {
    // 입력 검증
    if (userMessage) {
      this.validateInput(userMessage);
    }

    const session = await this.sessionService.findById(sessionId);
    if (!session) throw new NotFoundException('이야기를 찾을 수 없어요');
    this.assertSessionAccess(session, userId);

    if (userMessage) {
      const crisisResult = detectCrisis(userMessage);
      if (crisisResult.isCrisis) {
        await this.sessionService.addContext(
          sessionId,
          `[위기 감지: ${crisisResult.level}] 나: ${userMessage}`,
        );

        const crisisResponse =
          crisisResult.level === 'high'
            ? `지금 정말 힘드시군요. 당신의 마음이 느껴집니다.\n\n${crisisResult.recommendedAction}`
            : `많이 힘든 상황이시네요. ${crisisResult.recommendedAction}`;

        await this.sessionService.addContext(
          sessionId,
          `상담사: ${crisisResponse}`,
        );

        yield crisisResponse;
        return;
      }

      const offTopicReason = detectOffTopicRequest(userMessage);
      if (offTopicReason) {
        yield this.getScopeReply(offTopicReason).question;
        return;
      }

      this.validateContextCount(session.turnCount ?? session.context.length);

      const chatMessageCount = (session.fullContext ?? session.context).filter(
        (context: string) => context.startsWith('나:'),
      ).length;
      if (chatMessageCount >= CHAT_LIMITS.chatMessages) {
        throw new BadRequestException(
          '이야기 한도에 도달했어요. 이제 마무리해 주세요.',
        );
      }

      const costGuardReason = detectCostGuardReason(
        userMessage,
        session.fullContext ?? session.context,
      );
      if (costGuardReason) {
        const fallback = this.getCostGuardReply(costGuardReason).question;
        await this.sessionService.addContext(sessionId, `나: ${userMessage}`);
        await this.sessionService.addContext(sessionId, `상담사: ${fallback}`);
        yield fallback;
        return;
      }

      await this.sessionService.addContext(sessionId, `나: ${userMessage}`);
    }

    let fullResponse = '';
    for await (const chunk of this.openaiAgent.generateResponseStream(
      session.context,
      session.responseMode as ResponseMode,
      userMessage,
      (session as any).counselorType as CounselorType,
    )) {
      if (signal?.aborted) return;
      fullResponse += chunk;
      yield chunk;
    }

    await this.sessionService.addContext(sessionId, `상담사: ${fullResponse}`);

    // 첫 응답 후 세션 이름 생성 (아직 없으면)
    if (!session.alias) {
      // 비동기로 실행하여 응답 지연 방지
      this.tryGenerateSessionName(sessionId).catch(() => {
        // 무시
      });
    }
  }

  /**
   * 사용자의 세션 목록 조회
   */
  async getUserSessions(userId: string): Promise<SessionListItem[]> {
    if (userId === 'anonymous') {
      return [];
    }

    const sessions = await this.sessionRepository.getUserSessions(userId);

    return sessions.map((session) => ({
      sessionId: session._id.toString(),
      category: session.category,
      status: session.status as 'active' | 'completed',
      summary: session.summary,
      preview: buildSessionPreview({
        status: session.status,
        summary: session.summary,
        firstContext: session.fullContext?.[0],
      }),
      turnCount: (session as any).turnCount || 0,
      counselorType: session.counselorType,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      alias: session.alias,
    }));
  }

  /**
   * 세션 상세 조회
   */
  async getSessionDetail(
    sessionId: string,
    userId: string,
  ): Promise<SessionDetailResponse> {
    const session = await this.sessionRepository.getSessionDetail(sessionId);

    if (!session) {
      throw new NotFoundException('이야기를 찾을 수 없어요');
    }

    this.assertSessionAccess(session, userId);

    return {
      sessionId: session._id.toString(),
      category: session.category,
      status: session.status as 'active' | 'completed',
      context: session.context,
      fullContext: (session as any).fullContext || session.context,
      rollingSummary: (session as any).rollingSummary,
      summary: session.summary,
      counselorType: session.counselorType,
      responseMode: session.responseMode,
      turnCount: (session as any).turnCount || 0,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  /**
   * 게스트 세션 소유권 이전 — 비로그인 상태로 시작한 대화를 로그인 후 이어받는다.
   */
  async claimGuestSession(
    sessionId: string,
    userId: string,
  ): Promise<{ claimed: boolean }> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('이야기를 찾을 수 없어요');
    }

    // 이미 이 사용자 소유면 그대로 통과(중복 claim 안전).
    if (session.userId.toString() === userId) {
      return { claimed: true };
    }

    // 게스트 세션이 아니면(다른 실계정 소유) 이전 거부 — 타인 세션 탈취 방지.
    if (!(session as any).isGuest) {
      throw new ForbiddenException('이어받을 수 없는 이야기예요');
    }

    const updated = await this.sessionRepository.claimGuestSession(
      sessionId,
      userId,
    );
    return { claimed: !!updated };
  }

  /**
   * 세션 재개 (이어하기)
   */
  async resumeSession(sessionId: string, userId: string) {
    const release = this.chatRequestLimitService.acquire(sessionId);
    try {
      return await this.resumeSessionInternal(sessionId, userId);
    } finally {
      release();
    }
  }

  private async resumeSessionInternal(sessionId: string, userId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('이야기를 찾을 수 없어요');
    }

    this.assertSessionAccess(session, userId);

    // 완료된 세션이면 재활성화
    if (session.status === 'completed') {
      session.status = 'active';
      await session.save();
    }

    // 사용자 프로필 요약 가져오기
    let profileContext = '';
    if (userId !== 'anonymous') {
      const profileSummary =
        await this.userProfileRepository.getProfileSummary(userId);
      if (profileSummary) {
        profileContext = `[사용자 프로필]\n${profileSummary}\n\n`;
      }
    }

    // 롤링 요약 + 최근 컨텍스트로 새 질문 생성
    const rollingSummary = (session as any).rollingSummary || '';
    const contextForAI = rollingSummary
      ? [`[이전 대화 요약] ${rollingSummary}`, ...session.context.slice(-5)]
      : session.context;

    try {
      const options = await this.openaiAgent.generateOptions(
        contextForAI,
        'collecting',
        session.category as Category,
        session.counselorType as CounselorType,
      );

      return {
        sessionId: session._id.toString(),
        question: options.question,
        options: options.options || [],
        canProceedToResponse: options.canProceedToResponse,
        canRequestFeedback: options.canRequestFeedback,
        previousContext: session.context.slice(-10), // 최근 10개
        rollingSummary,
        summary: session.summary || '', // 세션 전체 요약
        category: session.category,
        counselorType: session.counselorType,
        turnCount: (session as any).turnCount || 0,
      };
    } catch (error) {
      // OpenAI API 에러 처리
      if (error.status === 429) {
        throw new HttpException(
          '지금 이용자가 많아요. 잠시 후 다시 시도해 주세요.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // 타임아웃 에러
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new HttpException(
          '응답이 늦어지고 있어요. 다시 시도해 주세요.',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      // 기타 OpenAI 에러
      throw new HttpException(
        '이야기를 이어가는 중 문제가 생겼어요. 다시 시도해 주세요.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 세션 저장하기
   */
  async saveSession(sessionId: string, userId: string, savedName?: string) {
    if (userId === 'anonymous') {
      throw new ForbiddenException('로그인이 필요해요.');
    }

    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('이야기를 찾을 수 없어요');
    }

    // 소유자 확인
    if (session.userId.toString() !== userId) {
      throw new ForbiddenException('접근 권한이 없어요');
    }

    const savedSession = await this.sessionRepository.saveSession(
      sessionId,
      savedName,
    );

    return {
      sessionId: savedSession!._id.toString(),
      isSaved: true,
      savedName: (savedSession as any).savedName,
      savedAt: (savedSession as any).savedAt?.toISOString(),
    };
  }

  /**
   * 저장된 세션 목록 조회
   */
  async getSavedSessions(userId: string) {
    if (userId === 'anonymous') {
      return [];
    }

    const sessions = await this.sessionRepository.getSavedSessions(userId);

    return sessions.map((session) => ({
      sessionId: session._id.toString(),
      category: session.category,
      savedName: (session as any).savedName,
      summary: session.summary,
      turnCount: (session as any).turnCount || 0,
      counselorType: session.counselorType,
      savedAt: (session as any).savedAt?.toISOString(),
      createdAt: session.createdAt.toISOString(),
    }));
  }

  /**
   * 세션 삭제
   */
  async deleteSession(sessionId: string, userId: string) {
    if (userId === 'anonymous') {
      throw new ForbiddenException('로그인이 필요해요.');
    }

    const deleted = await this.sessionRepository.deleteSession(
      sessionId,
      userId,
    );
    if (!deleted) {
      throw new NotFoundException(
        '이야기를 찾을 수 없거나 삭제 권한이 없어요.',
      );
    }

    return { success: true };
  }

  /**
   * 세션 별칭 수정
   */
  async updateSessionAlias(sessionId: string, userId: string, alias: string) {
    if (userId === 'anonymous') {
      throw new ForbiddenException('로그인이 필요해요.');
    }

    // 별칭 길이 제한
    if (alias.length > 50) {
      throw new BadRequestException('이름은 50자 이내로 입력해 주세요.');
    }

    const session = await this.sessionRepository.updateAlias(
      sessionId,
      userId,
      alias,
    );
    if (!session) {
      throw new NotFoundException(
        '이야기를 찾을 수 없거나 수정 권한이 없어요.',
      );
    }

    return {
      sessionId: session._id.toString(),
      alias: session.alias,
    };
  }

  /**
   * 롤링 요약 수행 - 오래된 context를 요약하고 최근 10개만 유지
   */
  private async performRollingSummary(sessionId: string, session: any) {
    const context = session.context;
    const existingSummary = session.rollingSummary || '';

    // 요약할 부분 (오래된 것들, 최근 10개 제외)
    const contextToSummarize = context.slice(0, -10);
    // 유지할 부분 (최근 10개)
    const recentContext = context.slice(-10);

    if (contextToSummarize.length === 0) return;

    try {
      // 롤링 요약 생성
      const newSummary = await this.openaiAgent.generateRollingSummary(
        existingSummary,
        contextToSummarize,
      );

      // DB 업데이트: 요약 저장 + context를 최근 10개만 남김
      await this.sessionRepository.updateRollingSummary(
        sessionId,
        newSummary,
        recentContext,
      );
    } catch {
      console.error('Rolling summary failed.');
      // 실패해도 대화는 계속 진행
    }
  }
}
