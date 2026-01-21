import { Injectable } from '@nestjs/common';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { SessionDocument } from '../../database/session.schema';
import { SessionRepository } from '../../persistence/session/session.repository';
import { CounselorType, ResponseMode } from '../../types/session';

@Injectable()
export class SessionService {
  constructor(
    private sessionRepository: SessionRepository,
    private openaiAgent: OpenAIAgent,
  ) {}

  async create(userId: string, category: string, counselorType?: CounselorType): Promise<SessionDocument> {
    return this.sessionRepository.create(userId, category, counselorType);
  }

  async findById(id: string): Promise<SessionDocument | null> {
    return this.sessionRepository.findById(id);
  }

  async findActiveByUser(userId: string): Promise<SessionDocument | null> {
    return this.sessionRepository.findActiveByUser(userId);
  }

  async addContext(
    sessionId: string,
    context: string,
  ): Promise<SessionDocument | null> {
    return this.sessionRepository.addContext(sessionId, context);
  }

  async setResponseMode(
    sessionId: string,
    mode: ResponseMode,
  ): Promise<SessionDocument | null> {
    return this.sessionRepository.setResponseMode(sessionId, mode);
  }

  async complete(sessionId: string): Promise<SessionDocument | null> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) return null;

    const summary = await this.openaiAgent.summarizeSession(session.context);
    return this.sessionRepository.complete(sessionId, summary);
  }

  async getUserHistory(userId: string): Promise<SessionDocument[]> {
    return this.sessionRepository.getUserHistory(userId);
  }
}
