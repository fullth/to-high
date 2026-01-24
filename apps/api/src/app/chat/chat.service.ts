import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { detectCrisis } from '../../common/crisis-detector';
import { SessionRepository } from '../../persistence/session/session.repository';
import { UserRepository } from '../../persistence/user/user.repository';
import { UserProfileRepository } from '../../persistence/user-profile/user-profile.repository';
import { RESPONSE_MODE_OPTIONS } from '../../types/chat';
import { Category, CounselorType, ResponseMode } from '../../types/session';
import { SessionService } from '../session/session.service';
import type { SessionListItem, SessionDetailResponse } from '../../controller/chat/dto/chat.response';

// 토큰 낭비 방지 제한
const MAX_INPUT_LENGTH = 500; // 최대 입력 길이
const MAX_CONTEXT_COUNT = 30; // 세션당 최대 대화 턴 수
const MAX_CHAT_MESSAGES = 20; // 채팅 모드 최대 메시지 수

// 무료 사용자 세션 제한
const FREE_USER_SESSION_LIMIT = 5;

@Injectable()
export class ChatService {
  constructor(
    private sessionService: SessionService,
    private sessionRepository: SessionRepository,
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository,
    private openaiAgent: OpenAIAgent,
  ) {}

  // 입력 길이 검증
  private validateInput(input: string): void {
    if (input.length > MAX_INPUT_LENGTH) {
      throw new BadRequestException(`입력이 너무 깁니다. ${MAX_INPUT_LENGTH}자 이내로 작성해주세요.`);
    }
  }

  // 세션 대화 수 검증
  private validateContextCount(contextCount: number): void {
    if (contextCount >= MAX_CONTEXT_COUNT) {
      throw new BadRequestException('세션 대화 한도에 도달했습니다. 새 상담을 시작해주세요.');
    }
  }

  async startSession(
    userId: string,
    category?: Category,
    initialText?: string,
    counselorType?: CounselorType,
  ) {
    // 입력 검증
    if (initialText) {
      this.validateInput(initialText);
    }

    // 무료 사용자 세션 제한 체크
    if (userId !== 'anonymous') {
      const user = await this.userRepository.findById(userId);

      // 구독자 또는 레거시 사용자는 제한 없음
      const isExempt = user?.isSubscribed || user?.isGrandfathered;

      if (!isExempt) {
        const sessionCount = await this.sessionRepository.countUserSessions(userId);
        if (sessionCount >= FREE_USER_SESSION_LIMIT) {
          throw new ForbiddenException({
            code: 'SESSION_LIMIT_EXCEEDED',
            message: '상담 일지를 적을 공책이 가득 찼어요.',
            sessionCount,
            limit: FREE_USER_SESSION_LIMIT,
          });
        }
      }
    }

    let previousContext: string | undefined;
    let previousSessionSummary: string | undefined;

    try {
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
        sessionCategory as Category,
        counselorType,
      );

      if (previousContext) {
        await this.sessionService.addContext(
          session._id.toString(),
          `[이전 상담 기록]\n${previousContext}`,
        );
      }

      // 직접 입력 텍스트가 있으면 컨텍스트에 추가
      if (initialText) {
        await this.sessionService.addContext(
          session._id.toString(),
          `[사용자 직접 입력] ${initialText}`,
        );
      }

      const updatedSession = initialText
        ? await this.sessionService.findById(session._id.toString())
        : session;

      const options = await this.openaiAgent.generateOptions(
        updatedSession!.context,
        initialText ? 'collecting' : 'initial',
        sessionCategory as Category,
        counselorType,
      );

      return {
        sessionId: session._id,
        hasHistory: !!previousContext,
        previousSessionSummary,
        contextCount: updatedSession!.context.length,
        ...options,
      };
    } catch (error) {
      console.error('startSession error:', error);
      throw error;
    }
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

  async selectOption(sessionId: string, selectedOption: string) {
    // 입력 검증
    this.validateInput(selectedOption);

    const session = await this.sessionService.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    // 대화 수 검증
    this.validateContextCount(session.context.length);

    const crisisResult = detectCrisis(selectedOption);
    if (crisisResult.isCrisis) {
      await this.sessionService.addContext(
        sessionId,
        `[위기 감지: ${crisisResult.level}] ${selectedOption}`,
      );

      return {
        sessionId,
        isCrisis: true,
        crisisLevel: crisisResult.level,
        crisisMessage: crisisResult.recommendedAction,
        canProceedToResponse: true,
        canRequestFeedback: true,
        responseModes: RESPONSE_MODE_OPTIONS,
        contextCount: session.context.length + 1,
      };
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

      const updatedSession = await this.sessionService.findById(sessionId);

      const options = await this.openaiAgent.generateOptions(
        updatedSession!.context,
        'collecting',
        updatedSession!.category as Category,
        (updatedSession as any).counselorType as CounselorType,
      );

      return {
        sessionId,
        contextSummary,
        contextCount: updatedSession!.context.length,
        ...options,
      };
    }

    // 공감 코멘트 생성
    const empathyComment = await this.openaiAgent.generateEmpathyComment(
      selectedOption,
      session.context,
    );

    await this.sessionService.addContext(sessionId, selectedOption);

    const updatedSession = await this.sessionService.findById(sessionId);

    const options = await this.openaiAgent.generateOptions(
      updatedSession!.context,
      'collecting',
      updatedSession!.category as Category,
      (updatedSession as any).counselorType as CounselorType,
    );

    if (options.canProceedToResponse) {
      return {
        sessionId,
        empathyComment,
        canProceedToResponse: true,
        canRequestFeedback: options.canRequestFeedback,
        responseModes: RESPONSE_MODE_OPTIONS,
        contextCount: updatedSession!.context.length,
      };
    }

    return {
      sessionId,
      empathyComment,
      contextCount: updatedSession!.context.length,
      ...options,
    };
  }

  async setMode(sessionId: string, mode: ResponseMode) {
    await this.sessionService.setResponseMode(sessionId, mode);
    return this.generateResponse(sessionId);
  }

  async generateResponse(sessionId: string, userMessage?: string) {
    // 입력 검증
    if (userMessage) {
      this.validateInput(userMessage);
    }

    const session = await this.sessionService.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    // 채팅 모드에서 메시지 수 제한
    const chatMessageCount = session.context.filter((c: string) => c.startsWith('나:')).length;
    if (chatMessageCount >= MAX_CHAT_MESSAGES) {
      throw new BadRequestException('대화 한도에 도달했습니다. 상담을 마무리해주세요.');
    }

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

        return {
          response: crisisResponse,
          isCrisis: true,
          crisisLevel: crisisResult.level,
        };
      }
    }

    const response = await this.openaiAgent.generateResponse(
      session.context,
      session.responseMode as ResponseMode,
      userMessage,
      (session as any).counselorType as CounselorType,
    );

    if (userMessage) {
      await this.sessionService.addContext(sessionId, `나: ${userMessage}`);
    }
    await this.sessionService.addContext(sessionId, `상담사: ${response}`);

    return { response };
  }

  async endSession(sessionId: string) {
    const session = await this.sessionService.complete(sessionId);
    return { summary: session?.summary };
  }

  /**
   * 스트리밍 방식으로 응답 모드 설정 및 응답 생성
   */
  async *setModeStream(sessionId: string, mode: ResponseMode) {
    await this.sessionService.setResponseMode(sessionId, mode);
    yield* this.generateResponseStream(sessionId);
  }

  /**
   * 스트리밍 방식으로 응답 생성
   */
  async *generateResponseStream(sessionId: string, userMessage?: string) {
    // 입력 검증
    if (userMessage) {
      this.validateInput(userMessage);
    }

    const session = await this.sessionService.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    // 채팅 모드에서 메시지 수 제한
    const chatMessageCount = session.context.filter((c: string) => c.startsWith('나:')).length;
    if (chatMessageCount >= MAX_CHAT_MESSAGES) {
      throw new BadRequestException('대화 한도에 도달했습니다. 상담을 마무리해주세요.');
    }

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

      await this.sessionService.addContext(sessionId, `나: ${userMessage}`);
    }

    let fullResponse = '';
    for await (const chunk of this.openaiAgent.generateResponseStream(
      session.context,
      session.responseMode as ResponseMode,
      userMessage,
      (session as any).counselorType as CounselorType,
    )) {
      fullResponse += chunk;
      yield chunk;
    }

    await this.sessionService.addContext(sessionId, `상담사: ${fullResponse}`);
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
      turnCount: (session as any).turnCount || 0,
      counselorType: session.counselorType,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }));
  }

  /**
   * 세션 상세 조회
   */
  async getSessionDetail(sessionId: string, userId: string): Promise<SessionDetailResponse> {
    const session = await this.sessionRepository.getSessionDetail(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // 소유자 확인
    if (userId !== 'anonymous' && session.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }

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
   * 세션 재개 (이어하기)
   */
  async resumeSession(sessionId: string, userId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // 소유자 확인
    if (userId !== 'anonymous' && session.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // 완료된 세션이면 재활성화
    if (session.status === 'completed') {
      session.status = 'active';
      await session.save();
    }

    // 사용자 프로필 요약 가져오기
    let profileContext = '';
    if (userId !== 'anonymous') {
      const profileSummary = await this.userProfileRepository.getProfileSummary(userId);
      if (profileSummary) {
        profileContext = `[사용자 프로필]\n${profileSummary}\n\n`;
      }
    }

    // 롤링 요약 + 최근 컨텍스트로 새 질문 생성
    const rollingSummary = (session as any).rollingSummary || '';
    const contextForAI = rollingSummary
      ? [`[이전 대화 요약] ${rollingSummary}`, ...session.context.slice(-5)]
      : session.context;

    const options = await this.openaiAgent.generateOptions(
      contextForAI,
      'collecting',
      session.category as Category,
      session.counselorType as CounselorType,
    );

    return {
      sessionId: session._id.toString(),
      question: options.question,
      options: options.options,
      canProceedToResponse: options.canProceedToResponse,
      canRequestFeedback: options.canRequestFeedback,
      previousContext: session.context.slice(-10), // 최근 10개
      rollingSummary,
      counselorType: session.counselorType,
    };
  }

  /**
   * 세션 저장하기
   */
  async saveSession(sessionId: string, userId: string, savedName?: string) {
    if (userId === 'anonymous') {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // 소유자 확인
    if (session.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const savedSession = await this.sessionRepository.saveSession(sessionId, savedName);

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
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    const deleted = await this.sessionRepository.deleteSession(sessionId, userId);
    if (!deleted) {
      throw new NotFoundException('세션을 찾을 수 없거나 삭제 권한이 없습니다.');
    }

    return { success: true };
  }

  /**
   * 세션 별칭 수정
   */
  async updateSessionAlias(sessionId: string, userId: string, alias: string) {
    if (userId === 'anonymous') {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    // 별칭 길이 제한
    if (alias.length > 50) {
      throw new BadRequestException('별칭은 50자 이내로 입력해주세요.');
    }

    const session = await this.sessionRepository.updateAlias(sessionId, userId, alias);
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없거나 수정 권한이 없습니다.');
    }

    return {
      sessionId: session._id.toString(),
      alias: session.alias,
    };
  }
}
