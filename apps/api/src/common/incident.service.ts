import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Connection } from 'mongoose';
import * as nodemailer from 'nodemailer';

export const INCIDENT_TYPES = [
  'api_failure',
  'chat_timeout',
  'chat_unavailable',
  'chat_summary_failure',
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

type Incident = {
  _id: string;
  kind: IncidentType;
  hour: string;
  createdAt: Date;
  githubDone?: boolean;
  emailDone?: boolean;
  issueUrl?: string;
  leaseId?: string;
  leaseUntil?: Date;
};

@Injectable()
export class IncidentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IncidentService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
  ) {}

  private get collection() {
    if (!this.connection.db) throw new Error('Incident storage unavailable');
    return this.connection.db.collection<Incident>('service_incident_outbox');
  }

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), 60_000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async report(kind: IncidentType) {
    if (!INCIDENT_TYPES.includes(kind)) return;
    const createdAt = new Date();
    const hour = createdAt.toISOString().slice(0, 13);
    try {
      await this.collection.updateOne(
        { _id: `${kind}:${hour}` },
        { $setOnInsert: { kind, hour, createdAt } },
        { upsert: true },
      );
    } catch (error) {
      if (
        !(
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 11000
        )
      )
        this.logger.warn('장애 알림을 기록하지 못했습니다.');
    }
  }

  async tick() {
    if (this.running) return;
    const token = this.config.get<string>('INCIDENT_GITHUB_TOKEN');
    const user = this.config.get<string>('GMAIL_USER');
    const password = this.config.get<string>('GMAIL_APP_PASSWORD');
    const recipient = this.config.get<string>('BUDGET_ALERT_RECIPIENT');
    if (!token && !(user && password && recipient)) return;
    this.running = true;
    const leaseId = randomUUID();
    try {
      const pending = await this.collection.findOneAndUpdate(
        {
          $and: [
            {
              $or: [
                { leaseUntil: { $exists: false } },
                { leaseUntil: { $lte: new Date() } },
              ],
            },
            {
              $or: [
                ...(token ? [{ githubDone: { $ne: true } }] : []),
                ...(user && password && recipient
                  ? [{ emailDone: { $ne: true } }]
                  : []),
              ],
            },
          ],
        },
        { $set: { leaseId, leaseUntil: new Date(Date.now() + 120_000) } },
        { returnDocument: 'after', sort: { createdAt: 1 } },
      );
      if (!pending) return;
      const safeFilter = { _id: pending._id, leaseId };
      if (
        !INCIDENT_TYPES.includes(pending.kind) ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(pending.hour)
      ) {
        this.logger.warn('장애 알림의 형식이 올바르지 않습니다.');
        return;
      }
      let issueUrl =
        pending.issueUrl &&
        /^https:\/\/github\.com\/fullth\/to-high\/issues\/\d+$/.test(
          pending.issueUrl,
        )
          ? pending.issueUrl
          : undefined;
      let retry = false;
      if (token && !pending.githubDone) {
        try {
          const title = `[운영 오류] ${pending.kind} ${pending.hour}:00 UTC`;
          const headers = {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          };
          const recent = await fetch(
            'https://api.github.com/repos/fullth/to-high/issues?state=all&per_page=100',
            { headers, signal: AbortSignal.timeout(10_000) },
          );
          if (!recent.ok) throw new Error('GitHub issue lookup failed');
          const recentIssues: unknown = await recent.json();
          if (!Array.isArray(recentIssues))
            throw new Error('GitHub issue lookup invalid');
          const existing = recentIssues.find((issue: unknown) => {
            if (!issue || typeof issue !== 'object') return false;
            const value = issue as {
              title?: unknown;
              html_url?: unknown;
              user?: { login?: unknown };
              pull_request?: unknown;
            };
            return (
              value.title === title &&
              value.user?.login === 'fullth' &&
              !value.pull_request &&
              typeof value.html_url === 'string' &&
              /^https:\/\/github\.com\/fullth\/to-high\/issues\/\d+$/.test(
                value.html_url,
              )
            );
          }) as { html_url: string } | undefined;
          if (existing) issueUrl = existing.html_url;
          else {
            const response = await fetch(
              'https://api.github.com/repos/fullth/to-high/issues',
              {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  title,
                  body: `오류 유형: ${pending.kind}\n발생 시간대: ${pending.hour}:00 UTC\n\n이 이슈에는 상담 내용과 사용자 정보를 포함하지 않습니다.`,
                }),
                signal: AbortSignal.timeout(10_000),
              },
            );
            if (!response.ok) throw new Error('GitHub issue creation failed');
            const result: unknown = await response.json();
            const url =
              typeof result === 'object' && result && 'html_url' in result
                ? result.html_url
                : null;
            if (
              typeof url !== 'string' ||
              !/^https:\/\/github\.com\/fullth\/to-high\/issues\/\d+$/.test(url)
            )
              throw new Error('Invalid issue URL');
            issueUrl = url;
          }
          await this.collection.updateOne(safeFilter, {
            $set: { githubDone: true, issueUrl },
          });
        } catch {
          retry = true;
          this.logger.warn('장애 이슈를 생성하지 못했습니다. 다시 시도합니다.');
        }
      }
      if (user && password && recipient && !pending.emailDone) {
        try {
          await nodemailer
            .createTransport({
              service: 'gmail',
              auth: { user, pass: password },
              connectionTimeout: 10_000,
              greetingTimeout: 10_000,
              socketTimeout: 15_000,
            })
            .sendMail({
              from: user,
              to: recipient,
              subject: '[위로] 서비스 오류 알림',
              text: `오류 유형: ${pending.kind}\n발생 시간대: ${pending.hour}:00 UTC\n${issueUrl ? `이슈: ${issueUrl}` : 'GitHub 이슈 생성 상태를 확인해 주세요.'}`,
            });
          await this.collection.updateOne(safeFilter, {
            $set: { emailDone: true },
          });
        } catch {
          retry = true;
          this.logger.warn('장애 메일을 발송하지 못했습니다. 다시 시도합니다.');
        }
      }
      await this.collection.updateOne(
        safeFilter,
        retry
          ? {
              $set: { leaseUntil: new Date(Date.now() + 300_000) },
              $unset: { leaseId: '' },
            }
          : { $unset: { leaseId: '', leaseUntil: '' } },
      );
    } catch {
      this.logger.warn('장애 알림 대기열을 확인하지 못했습니다.');
    } finally {
      this.running = false;
    }
  }
}
