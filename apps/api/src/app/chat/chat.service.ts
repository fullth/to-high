import { Injectable, NotFoundException } from '@nestjs/common';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { RESPONSE_MODE_OPTIONS } from '../../types/chat';
import { ResponseMode } from '../../types/session';
import { SessionService } from '../session/session.service';

@Injectable()
export class ChatService {
  constructor(
    private sessionService: SessionService,
    private openaiAgent: OpenAIAgent,
  ) {}

  async startSession(userId: string, category: string) {
    const session = await this.sessionService.create(userId, category);

    const options = await this.openaiAgent.generateOptions(
      session.context,
      'initial',
    );

    return {
      sessionId: session._id,
      ...options,
    };
  }

  async selectOption(sessionId: string, selectedOption: string) {
    const session = await this.sessionService.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    await this.sessionService.addContext(sessionId, selectedOption);

    const updatedSession = await this.sessionService.findById(sessionId);

    const options = await this.openaiAgent.generateOptions(
      updatedSession!.context,
      'collecting',
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
