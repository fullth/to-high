import { Injectable, NotFoundException } from '@nestjs/common';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { detectCrisis } from '../../common/crisis-detector';
import { SessionRepository } from '../../persistence/session/session.repository';
import { RESPONSE_MODE_OPTIONS } from '../../types/chat';
import { Category, ResponseMode } from '../../types/session';
import { SessionService } from '../session/session.service';

@Injectable()
export class ChatService {
  constructor(
    private sessionService: SessionService,
    private sessionRepository: SessionRepository,
    private openaiAgent: OpenAIAgent,
  ) {}

  async startSession(userId: string, category: Category) {
    let previousContext: string | undefined;

    if (userId !== 'anonymous') {
      const recentSummaries =
        await this.sessionRepository.getRecentSummaries(userId);
      if (recentSummaries.length > 0) {
        previousContext = recentSummaries
          .map((s) => `[이전 상담: ${s.category}] ${s.summary}`)
          .join('\n');
      }
    }

    const session = await this.sessionService.create(userId, category);

    if (previousContext) {
      await this.sessionService.addContext(
        session._id.toString(),
        `[이전 상담 기록]\n${previousContext}`,
      );
    }

    const options = await this.openaiAgent.generateOptions(
      session.context,
      'initial',
      category,
    );

    return {
      sessionId: session._id,
      hasHistory: !!previousContext,
      ...options,
    };
  }

  async selectOption(sessionId: string, selectedOption: string) {
    const session = await this.sessionService.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

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
        canProceedToResponse: true,
        responseModes: RESPONSE_MODE_OPTIONS,
      };
    }

    return {
      sessionId,
      ...options,
    };
  }

  async setMode(sessionId: string, mode: ResponseMode) {
    await this.sessionService.setResponseMode(sessionId, mode);
    return this.generateResponse(sessionId);
  }

  async generateResponse(sessionId: string, userMessage?: string) {
    const session = await this.sessionService.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

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
}
