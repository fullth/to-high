import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { detectCrisis } from '../../common/crisis-detector';
import { SessionRepository } from '../../persistence/session/session.repository';
import { RESPONSE_MODE_OPTIONS } from '../../types/chat';
import { Category, CounselorType, ResponseMode } from '../../types/session';
import { SessionService } from '../session/session.service';

// 토큰 낭비 방지 제한
const MAX_INPUT_LENGTH = 500; // 최대 입력 길이
const MAX_CONTEXT_COUNT = 30; // 세션당 최대 대화 턴 수
const MAX_CHAT_MESSAGES = 20; // 채팅 모드 최대 메시지 수

@Injectable()
export class ChatService {
  constructor(
    private sessionService: SessionService,
    private sessionRepository: SessionRepository,
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

    let previousContext: string | undefined;

    try {
      if (userId !== 'anonymous') {
        const recentSummaries =
          await this.sessionRepository.getRecentSummaries(userId);
        if (recentSummaries.length > 0) {
          previousContext = recentSummaries
            .map((s) => `[이전 상담: ${s.category}] ${s.summary}`)
            .join('\n');
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
      );

      return {
        sessionId: session._id,
        hasHistory: !!previousContext,
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
        responseModes: RESPONSE_MODE_OPTIONS,
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
      );

      return {
        sessionId,
        contextSummary,
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
    );

    if (options.canProceedToResponse) {
      return {
        sessionId,
        empathyComment,
        canProceedToResponse: true,
        responseModes: RESPONSE_MODE_OPTIONS,
      };
    }

    return {
      sessionId,
      empathyComment,
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
}
