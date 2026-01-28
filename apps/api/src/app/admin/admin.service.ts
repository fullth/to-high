import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument } from '../../database/user.schema';
import { SessionDocument } from '../../database/session.schema';
import { VisitorDocument } from '../../database/visitor.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserDocument.name) private userModel: Model<UserDocument>,
    @InjectModel(SessionDocument.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(VisitorDocument.name) private visitorModel: Model<VisitorDocument>,
  ) {}

  async getDashboardStats() {
    const today = new Date(new Date().setHours(0, 0, 0, 0));

    const [totalUsers, totalSessions, activeSessions, todayUsers, todaySessions, totalVisitors, todayVisitors] = await Promise.all([
      this.userModel.countDocuments(),
      this.sessionModel.countDocuments(),
      this.sessionModel.countDocuments({ status: 'active' }),
      this.userModel.countDocuments({
        createdAt: { $gte: today },
      }),
      this.sessionModel.countDocuments({
        createdAt: { $gte: today },
      }),
      this.visitorModel.countDocuments(),
      this.visitorModel.countDocuments({
        lastVisitAt: { $gte: today },
      }),
    ]);

    // 구독자 수
    const subscribers = await this.userModel.countDocuments({ isSubscribed: true });

    return {
      totalUsers,
      totalSessions,
      activeSessions,
      todayUsers,
      todaySessions,
      subscribers,
      totalVisitors,
      todayVisitors,
    };
  }

  async getUsersWithSessionCount() {
    const users = await this.userModel
      .find()
      .select('email name picture createdAt isSubscribed isGrandfathered')
      .sort({ createdAt: -1 })
      .lean();

    // 각 사용자별 세션 수 조회
    const usersWithSessions = await Promise.all(
      users.map(async (user) => {
        const sessionCount = await this.sessionModel.countDocuments({
          userId: user._id,
        });
        const lastSession = await this.sessionModel
          .findOne({ userId: user._id })
          .sort({ updatedAt: -1 })
          .select('updatedAt category')
          .lean();

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          picture: user.picture,
          createdAt: user.createdAt,
          isSubscribed: user.isSubscribed || false,
          isGrandfathered: user.isGrandfathered || false,
          sessionCount,
          lastSessionAt: lastSession?.updatedAt,
          lastCategory: lastSession?.category,
        };
      }),
    );

    return { users: usersWithSessions };
  }

  /**
   * 모든 세션 목록 조회 (비로그인 사용자 포함)
   */
  async getAllSessions(filter?: { anonymous?: boolean; limit?: number; offset?: number }) {
    const query: Record<string, unknown> = {};

    // 비로그인 사용자만 필터링
    if (filter?.anonymous === true) {
      query.userId = 'anonymous';
    } else if (filter?.anonymous === false) {
      query.userId = { $ne: 'anonymous' };
    }

    // limit이 0이면 전체 조회
    const sessionQuery = this.sessionModel
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(filter?.offset || 0);

    if (filter?.limit && filter.limit > 0) {
      sessionQuery.limit(filter.limit);
    }

    const [sessions, total] = await Promise.all([
      sessionQuery.lean(),
      this.sessionModel.countDocuments(query),
    ]);

    // 사용자 정보 매핑
    const sessionsWithUser = await Promise.all(
      sessions.map(async (session) => {
        let userEmail = '비로그인';
        let userName = '';

        if (session.userId && session.userId.toString() !== 'anonymous') {
          try {
            const user = await this.userModel.findById(session.userId).select('email name').lean();
            if (user) {
              userEmail = user.email;
              userName = user.name || '';
            }
          } catch {
            // ObjectId가 아닌 경우 무시
          }
        }

        return {
          id: session._id.toString(),
          userId: session.userId?.toString() || 'anonymous',
          userEmail,
          userName,
          category: session.category,
          status: session.status,
          summary: session.summary,
          turnCount: session.turnCount,
          counselorType: session.counselorType,
          isSaved: session.isSaved,
          savedName: session.savedName,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        };
      }),
    );

    return {
      sessions: sessionsWithUser,
      total,
      hasMore: (filter?.offset || 0) + sessions.length < total,
    };
  }

  /**
   * 세션 상세 조회 (대화 내용 포함)
   */
  async getSessionDetail(sessionId: string) {
    let session;
    try {
      session = await this.sessionModel.findById(sessionId).lean();
    } catch {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    let userEmail = '비로그인';
    let userName = '';

    if (session.userId && session.userId.toString() !== 'anonymous') {
      try {
        const user = await this.userModel.findById(session.userId).select('email name').lean();
        if (user) {
          userEmail = user.email;
          userName = user.name || '';
        }
      } catch {
        // ObjectId가 아닌 경우 무시
      }
    }

    return {
      id: session._id.toString(),
      userId: session.userId?.toString() || 'anonymous',
      userEmail,
      userName,
      category: session.category,
      status: session.status,
      summary: session.summary,
      rollingSummary: session.rollingSummary,
      turnCount: session.turnCount,
      counselorType: session.counselorType,
      responseMode: session.responseMode,
      isSaved: session.isSaved,
      savedName: session.savedName,
      alias: session.alias,
      context: session.context || [],
      fullContext: session.fullContext || [],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  /**
   * 세션 삭제
   */
  async deleteSession(sessionId: string) {
    let result;
    try {
      result = await this.sessionModel.findByIdAndDelete(sessionId);
    } catch {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (!result) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    return { success: true, sessionId };
  }

  /**
   * 여러 세션 일괄 삭제
   */
  async deleteSessions(sessionIds: string[]) {
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return {
        success: true,
        deletedCount: 0,
      };
    }

    const objectIds: Types.ObjectId[] = [];
    for (const id of sessionIds) {
      try {
        if (id && typeof id === 'string') {
          objectIds.push(new Types.ObjectId(id));
        }
      } catch {
        // 유효하지 않은 ObjectId는 무시
        console.log(`Invalid ObjectId: ${id}`);
      }
    }

    if (objectIds.length === 0) {
      return {
        success: true,
        deletedCount: 0,
      };
    }

    const result = await this.sessionModel.deleteMany({
      _id: { $in: objectIds },
    });

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  }

  /**
   * 방문자 기록/업데이트
   */
  async trackVisitor(visitorId: string, ip?: string, userAgent?: string) {
    const now = new Date();

    const visitor = await this.visitorModel.findOneAndUpdate(
      { visitorId },
      {
        $set: {
          ip,
          userAgent,
          lastVisitAt: now,
        },
        $setOnInsert: {
          firstVisitAt: now,
        },
        $inc: { visitCount: 1 },
      },
      { upsert: true, new: true },
    );

    return {
      visitorId: visitor.visitorId,
      visitCount: visitor.visitCount,
      isNew: visitor.visitCount === 1,
    };
  }

  /**
   * 방문자 목록 조회
   */
  async getVisitors(filter?: { limit?: number; offset?: number }) {
    const visitors = await this.visitorModel
      .find()
      .sort({ lastVisitAt: -1 })
      .skip(filter?.offset || 0)
      .limit(filter?.limit || 50)
      .lean();

    const total = await this.visitorModel.countDocuments();

    return {
      visitors: visitors.map((v) => ({
        id: v._id.toString(),
        visitorId: v.visitorId,
        ip: v.ip,
        userAgent: v.userAgent,
        visitCount: v.visitCount,
        firstVisitAt: v.firstVisitAt,
        lastVisitAt: v.lastVisitAt,
      })),
      total,
    };
  }
}
