import { createHash } from 'node:crypto';
import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SessionDocument } from '../../database/session.schema';
import { CounselorType, ResponseMode } from '../../types/session';

// 롤링 요약 기준 (이 수를 넘으면 요약)
const ROLLING_SUMMARY_THRESHOLD = 10;

// 게스트(비로그인) 세션 보관 기간 (30일)
const GUEST_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable({ scope: Scope.REQUEST })
export class SessionRepository {
  private createdGuestHash?: string;
  constructor(
    @InjectModel(SessionDocument.name)
    private sessionModel: Model<SessionDocument>,
    @Optional()
    @Inject(REQUEST)
    private readonly request?: {
      user?: { userId: string };
      headers?: Record<string, string | string[] | undefined>;
      route?: { path?: string };
    },
  ) {}

  // Recheck ownership atomically in every DB operation: guards alone cannot
  // prevent a claim on another replica between authorization and mutation.
  private ownershipFilter(): Record<string, unknown> {
    if (!this.request) return {}; // Non-HTTP callers retain their explicit ownership checks.
    if (this.createdGuestHash)
      return { isGuest: true, guestAccessHash: this.createdGuestHash };
    const token = this.request.headers?.['x-guest-token'];
    const guest =
      typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
        ? {
            isGuest: true,
            guestAccessHash: createHash('sha256').update(token).digest('hex'),
          }
        : { _id: null };
    const userId = this.request.user?.userId;
    if (userId && Types.ObjectId.isValid(userId)) {
      const owner = {
        isGuest: { $ne: true },
        userId: new Types.ObjectId(userId),
      };
      return this.request.route?.path?.endsWith('/claim')
        ? { $or: [owner, guest] }
        : owner;
    }
    return guest;
  }

  private ownedFilter(sessionId: string): Record<string, unknown> {
    return {
      $and: [{ _id: new Types.ObjectId(sessionId) }, this.ownershipFilter()],
    };
  }

  private requireOwnedResult<T>(result: T | null): T | null {
    if (this.request && !result)
      throw new NotFoundException('이야기를 찾을 수 없어요');
    return result;
  }

  async create(
    userId: string,
    category: string,
    counselorType?: CounselorType,
    guestAccessHash?: string,
  ): Promise<SessionDocument> {
    const isValidObjectId =
      Types.ObjectId.isValid(userId) && userId !== 'anonymous';
    const isGuest = !isValidObjectId;
    if (this.request && isGuest && guestAccessHash)
      this.createdGuestHash = guestAccessHash;
    const initialContext = [`카테고리: ${category}`];
    return this.sessionModel.create({
      userId: isValidObjectId
        ? new Types.ObjectId(userId)
        : new Types.ObjectId(),
      isGuest,
      ...(isGuest && guestAccessHash && { guestAccessHash }),
      // 게스트 세션은 30일 뒤 자동 삭제되도록 만료 시각을 남긴다.
      ...(isGuest && { expireAt: new Date(Date.now() + GUEST_SESSION_TTL_MS) }),
      context: initialContext,
      fullContext: initialContext,
      category,
      turnCount: 0,
      ...(counselorType && { counselorType }),
    });
  }

  // 게스트 세션의 소유권을 로그인 사용자에게 이전한다.
  // 이미 실계정 소유(비게스트) 세션은 대상이 아니므로 null 을 반환한다.
  // 이전과 동시에 만료 시각을 제거해 영구 보관으로 전환한다.
  async claimGuestSession(
    sessionId: string,
    userId: string,
  ): Promise<SessionDocument | null> {
    return this.sessionModel.findOneAndUpdate(
      { $and: [this.ownedFilter(sessionId), { isGuest: true }] },
      {
        $set: { userId: new Types.ObjectId(userId), isGuest: false },
        $unset: { expireAt: '', guestAccessHash: '' },
      },
      { new: true },
    );
  }

  async findForAccess(id: string): Promise<SessionDocument | null> {
    return (await this.sessionModel
      .findById(id)
      .select('+guestAccessHash')
      .exec()) as SessionDocument | null;
  }

  async findById(id: string): Promise<SessionDocument | null> {
    return this.requireOwnedResult(
      await this.sessionModel.findOne(this.ownedFilter(id)),
    );
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
    return this.requireOwnedResult(
      await this.sessionModel.findOneAndUpdate(
        this.ownedFilter(sessionId),
        {
          $push: { context, fullContext: context },
          $inc: { turnCount: 1 },
        },
        { new: true },
      ),
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
    return this.requireOwnedResult(
      await this.sessionModel.findOneAndUpdate(
        this.ownedFilter(sessionId),
        {
          rollingSummary,
          context: recentContextToKeep,
        },
        { new: true },
      ),
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
    return this.requireOwnedResult(
      await this.sessionModel.findOneAndUpdate(
        this.ownedFilter(sessionId),
        { responseMode: mode },
        { new: true },
      ),
    );
  }

  /**
   * 세션 완료 (context 삭제하지 않음)
   */
  async complete(
    sessionId: string,
    summary: string,
  ): Promise<SessionDocument | null> {
    return this.requireOwnedResult(
      await this.sessionModel.findOneAndUpdate(
        this.ownedFilter(sessionId),
        { status: 'completed', summary },
        { new: true },
      ),
    );
  }

  async reactivate(sessionId: string): Promise<SessionDocument | null> {
    return this.requireOwnedResult(
      await this.sessionModel.findOneAndUpdate(
        this.ownedFilter(sessionId),
        { status: 'active' },
        { new: true },
      ),
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
  async getUserSessions(
    userId: string,
    limit = 20,
  ): Promise<SessionDocument[]> {
    // 목록 미리보기용으로 fullContext 첫 항목만 $slice 로 가져온다(전체 대화 메모리 적재 방지).
    return this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .select({
        summary: 1,
        category: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        counselorType: 1,
        turnCount: 1,
        alias: 1,
        fullContext: { $slice: 1 },
      })
      .sort({ updatedAt: -1 })
      .limit(limit);
  }

  /**
   * 세션 상세 조회 (전체 대화 포함)
   */
  async getSessionDetail(sessionId: string): Promise<SessionDocument | null> {
    return this.requireOwnedResult(
      await this.sessionModel.findOne(this.ownedFilter(sessionId)),
    );
  }

  /**
   * 사용자의 세션 수 카운트
   */
  async countUserSessions(userId: string): Promise<number> {
    return this.sessionModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
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
    return this.requireOwnedResult(
      await this.sessionModel.findOneAndUpdate(
        this.ownedFilter(sessionId),
        {
          isSaved: true,
          savedAt: new Date(),
          ...(savedName && { savedName }),
        },
        { new: true },
      ),
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
      .select(
        'summary category savedName savedAt createdAt counselorType turnCount',
      )
      .sort({ savedAt: -1 });
  }

  /**
   * 세션 삭제
   */
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.sessionModel.deleteOne({
      $and: [this.ownedFilter(sessionId)],
      userId: new Types.ObjectId(userId),
    });
    if (this.request && result.deletedCount === 0)
      throw new NotFoundException('이야기를 찾을 수 없어요');
    return result.deletedCount > 0;
  }

  /**
   * 세션 별칭 수정
   */
  async updateAlias(
    sessionId: string,
    userId: string,
    alias: string,
  ): Promise<SessionDocument | null> {
    try {
      return this.requireOwnedResult(
        await this.sessionModel.findOneAndUpdate(
          {
            $and: [this.ownedFilter(sessionId)],
            userId: new Types.ObjectId(userId),
          },
          { alias },
          { new: true },
        ),
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return null;
    }
  }
}
