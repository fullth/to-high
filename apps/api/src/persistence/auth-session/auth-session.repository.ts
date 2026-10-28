import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthSessionDocument } from '../../database/auth-session.schema';

@Injectable()
export class AuthSessionRepository {
  constructor(
    @InjectModel(AuthSessionDocument.name)
    private readonly authSessionModel: Model<AuthSessionDocument>,
  ) {}

  create(
    userId: string,
    provider: 'google' | 'kakao',
    expiresAt: Date,
  ): Promise<AuthSessionDocument> {
    return this.authSessionModel.create({
      userId: new Types.ObjectId(userId),
      provider,
      expiresAt,
    });
  }

  findActive(
    sessionId: string,
    userId: string,
  ): Promise<AuthSessionDocument | null> {
    if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(userId))
      return Promise.resolve(null);
    return this.authSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
  }

  async revoke(sessionId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(userId))
      return;
    await this.authSessionModel.updateOne(
      {
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } },
    );
  }
}
