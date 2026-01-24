import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SessionDocument } from '../../database/session.schema';
import { CounselorType, ResponseMode } from '../../types/session';

// 롤링 요약 기준 (이 수를 넘으면 요약)
const ROLLING_SUMMARY_THRESHOLD = 10;

@Injectable()
export class SessionRepository {
  constructor(
    @InjectModel(SessionDocument.name)
    private sessionModel: Model<SessionDocument>,
  ) {}

  async create(userId: string, category: string, counselorType?: CounselorType): Promise<SessionDocument> {
    const isValidObjectId = Types.ObjectId.isValid(userId) && userId !== 'anonymous';
    const initialContext = [`카테고리: ${category}`];
    return this.sessionModel.create({
      userId: isValidObjectId ? new Types.ObjectId(userId) : new Types.ObjectId(),
      context: initialContext,
      fullContext: initialContext,
      category,
      turnCount: 0,
      ...(counselorType && { counselorType }),
    });
  }

  async findById(id: string): Promise<SessionDocument | null> {
    return this.sessionModel.findById(id);
  }

  async findActiveByUser(userId: string): Promise<SessionDocument | null> {
    return this.sessionModel.findOne({
      userId: new Types.ObjectId(userId),
      status: 'active',
    });
  }

  /**
   * 컨텍스트 추가 (fullContext에도 저장)
   */
  async addContext(
    sessionId: string,
    context: string,
  ): Promise<SessionDocument | null> {
    return this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        $push: { context, fullContext: context },
        $inc: { turnCount: 1 },
      },
      { new: true },
    );
  }

  /**
   * 롤링 요약 업데이트 (오래된 context를 요약으로 대체)
   */
  async updateRollingSummary(
    sessionId: string,
    rollingSummary: string,
    recentContextToKeep: string[],
  ): Promise<SessionDocument | null> {
    return this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        rollingSummary,
        context: recentContextToKeep,
      },
      { new: true },
    );
  }

  /**
   * 롤링 요약 필요 여부 확인
   */
  needsRollingSummary(contextLength: number): boolean {
    return contextLength > ROLLING_SUMMARY_THRESHOLD;
  }

  async setResponseMode(
    sessionId: string,
    mode: ResponseMode,
  ): Promise<SessionDocument | null> {
    return this.sessionModel.findByIdAndUpdate(
      sessionId,
      { responseMode: mode },
      { new: true },
    );
  }

  /**
   * 세션 완료 (context 삭제하지 않음)
   */
  async complete(
    sessionId: string,
    summary: string,
  ): Promise<SessionDocument | null> {
    return this.sessionModel.findByIdAndUpdate(
      sessionId,
      { status: 'completed', summary },
      { new: true },
    );
  }

  /**
   * 사용자의 상담 이력 조회 (목록용)
   */
  async getUserHistory(userId: string, limit = 10): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
        status: 'completed',
      })
      .select('summary category createdAt responseMode counselorType turnCount')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * 사용자의 활성 + 완료 세션 목록 (이어하기용)
   */
  async getUserSessions(userId: string, limit = 20): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .select('summary category status createdAt updatedAt counselorType turnCount')
      .sort({ updatedAt: -1 })
      .limit(limit);
  }

  /**
   * 세션 상세 조회 (전체 대화 포함)
   */
  async getSessionDetail(sessionId: string): Promise<SessionDocument | null> {
    return this.sessionModel.findById(sessionId);
  }

  async getRecentSummaries(
    userId: string,
    limit = 3,
  ): Promise<{ summary: string; category: string; createdAt: Date }[]> {
    const sessions = await this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
        status: 'completed',
        summary: { $exists: true, $ne: '' },
      })
      .select('summary category createdAt')
      .sort({ createdAt: -1 })
      .limit(limit);

    return sessions.map((s) => ({
      summary: s.summary,
      category: s.category,
      createdAt: s.createdAt,
    }));
  }

  /**
   * 세션 저장하기
   */
  async saveSession(
    sessionId: string,
    savedName?: string,
  ): Promise<SessionDocument | null> {
    return this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        isSaved: true,
        savedAt: new Date(),
        ...(savedName && { savedName }),
      },
      { new: true },
    );
  }

  /**
   * 저장된 세션 목록 조회
   */
  async getSavedSessions(userId: string): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
        isSaved: true,
      })
      .select('summary category savedName savedAt createdAt counselorType turnCount')
      .sort({ savedAt: -1 });
  }
}
