import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserProfileDocument } from '../../database/user-profile.schema';

@Injectable()
export class UserProfileRepository {
  constructor(
    @InjectModel(UserProfileDocument.name)
    private userProfileModel: Model<UserProfileDocument>,
  ) {}

  /**
   * 프로필 조회 또는 생성
   */
  async findOrCreate(userId: string): Promise<UserProfileDocument> {
    const userObjectId = new Types.ObjectId(userId);

    let profile = await this.userProfileModel.findOne({ userId: userObjectId });

    if (!profile) {
      profile = await this.userProfileModel.create({
        userId: userObjectId,
      });
    }

    return profile;
  }

  /**
   * 프로필 조회
   */
  async findByUserId(userId: string): Promise<UserProfileDocument | null> {
    return this.userProfileModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  /**
   * 감정 패턴 추가/업데이트
   */
  async addEmotionPatterns(userId: string, emotions: string[]): Promise<void> {
    const profile = await this.findOrCreate(userId);

    for (const emotion of emotions) {
      const existing = profile.emotionPatterns.find((e) => e.emotion === emotion);
      if (existing) {
        existing.count += 1;
        existing.lastMentioned = new Date();
      } else {
        profile.emotionPatterns.push({
          emotion,
          count: 1,
          lastMentioned: new Date(),
        });
      }
    }

    await profile.save();
  }

  /**
   * 주요 이슈/주제 추가/업데이트
   */
  async addCoreIssues(userId: string, topics: string[]): Promise<void> {
    const profile = await this.findOrCreate(userId);

    for (const topic of topics) {
      const existing = profile.coreIssues.find((i) => i.topic === topic);
      if (existing) {
        existing.count += 1;
        existing.lastMentioned = new Date();
      } else {
        profile.coreIssues.push({
          topic,
          count: 1,
          lastMentioned: new Date(),
          summary: '',
        });
      }
    }

    await profile.save();
  }

  /**
   * 중요 컨텍스트 추가 (최대 10개 유지)
   */
  async addImportantContext(userId: string, contexts: string[]): Promise<void> {
    const profile = await this.findOrCreate(userId);

    // 중복 제거 후 추가
    const newContexts = contexts.filter(
      (c) => !profile.importantContext.includes(c),
    );

    profile.importantContext.push(...newContexts);

    // 최대 10개만 유지 (최신순)
    if (profile.importantContext.length > 10) {
      profile.importantContext = profile.importantContext.slice(-10);
    }

    await profile.save();
  }

  /**
   * 세션 완료 시 프로필 업데이트
   */
  async updateAfterSession(
    userId: string,
    sessionSummary: string,
    counselorType?: string,
    responseMode?: string,
  ): Promise<void> {
    const profile = await this.findOrCreate(userId);

    profile.totalSessions += 1;
    profile.lastSessionSummary = sessionSummary;

    if (counselorType) {
      profile.preferredCounselorType = counselorType;
    }

    if (responseMode) {
      profile.preferredResponseMode = responseMode;
    }

    await profile.save();
  }

  /**
   * 프로필 요약 텍스트 생성 (AI에 전달용)
   */
  async getProfileSummary(userId: string): Promise<string | null> {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    const parts: string[] = [];

    // 주요 감정
    const topEmotions = profile.emotionPatterns
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((e) => e.emotion);
    if (topEmotions.length > 0) {
      parts.push(`주요 감정: ${topEmotions.join(', ')}`);
    }

    // 주요 주제
    const topIssues = profile.coreIssues
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((i) => i.topic);
    if (topIssues.length > 0) {
      parts.push(`주요 주제: ${topIssues.join(', ')}`);
    }

    // 중요 컨텍스트
    if (profile.importantContext.length > 0) {
      parts.push(`핵심 정보: ${profile.importantContext.slice(-3).join(', ')}`);
    }

    // 마지막 상담
    if (profile.lastSessionSummary) {
      parts.push(`최근 상담: ${profile.lastSessionSummary}`);
    }

    return parts.length > 0 ? parts.join('\n') : null;
  }
}
