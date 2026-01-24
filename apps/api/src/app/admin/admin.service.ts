import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from '../../database/user.schema';
import { SessionDocument } from '../../database/session.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserDocument.name) private userModel: Model<UserDocument>,
    @InjectModel(SessionDocument.name) private sessionModel: Model<SessionDocument>,
  ) {}

  async getDashboardStats() {
    const [totalUsers, totalSessions, activeSessions, todayUsers, todaySessions] = await Promise.all([
      this.userModel.countDocuments(),
      this.sessionModel.countDocuments(),
      this.sessionModel.countDocuments({ status: 'active' }),
      this.userModel.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      this.sessionModel.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
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
}
