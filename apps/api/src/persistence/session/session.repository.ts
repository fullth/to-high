import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SessionDocument } from '../../database/session.schema';
import { CounselorType, ResponseMode } from '../../types/session';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectModel(SessionDocument.name)
    private sessionModel: Model<SessionDocument>,
  ) {}

  async create(userId: string, category: string, counselorType?: CounselorType): Promise<SessionDocument> {
    const isValidObjectId = Types.ObjectId.isValid(userId) && userId !== 'anonymous';
    return this.sessionModel.create({
      userId: isValidObjectId ? new Types.ObjectId(userId) : new Types.ObjectId(),
      context: [`카테고리: ${category}`],
      category,
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

  async addContext(
    sessionId: string,
    context: string,
  ): Promise<SessionDocument | null> {
    return this.sessionModel.findByIdAndUpdate(
      sessionId,
      { $push: { context } },
      { new: true },
    );
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

  async complete(
    sessionId: string,
    summary: string,
  ): Promise<SessionDocument | null> {
    return this.sessionModel.findByIdAndUpdate(
      sessionId,
      { status: 'completed', summary, context: [] },
      { new: true },
    );
  }

  async getUserHistory(userId: string, limit = 10): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
        status: 'completed',
      })
      .select('summary category createdAt responseMode')
      .sort({ createdAt: -1 })
      .limit(limit);
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
}
