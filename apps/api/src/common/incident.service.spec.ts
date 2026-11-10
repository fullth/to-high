import { ConfigService } from '@nestjs/config';
import type { Connection } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { IncidentService } from './incident.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('incident reporting', () => {
  const sendMail = jest.fn().mockResolvedValue({});
  const updateOne = jest.fn().mockResolvedValue({});
  const findOneAndUpdate = jest.fn();
  const config = {
    get: (key: string) =>
      ({
        INCIDENT_GITHUB_TOKEN: 'synthetic-token',
        GMAIL_USER: 'sender@example.test',
        GMAIL_APP_PASSWORD: 'synthetic-password',
        BUDGET_ALERT_RECIPIENT: 'recipient@example.test',
      })[key],
  } as ConfigService;
  const connection = {
    db: { collection: () => ({ updateOne, findOneAndUpdate }) },
  } as unknown as Connection;
  let service: IncidentService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncidentService(connection, config);
    jest
      .mocked(nodemailer.createTransport)
      .mockReturnValue({ sendMail } as never);
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          html_url: 'https://github.com/fullth/to-high/issues/123',
        }),
      } as Response);
  });
  afterEach(() => jest.restoreAllMocks());

  it('groups valid errors by type and hour and ignores arbitrary input', async () => {
    await service.report('chat_timeout');
    await service.report('private-user-text' as never);
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(updateOne.mock.calls)).not.toContain(
      'private-user-text',
    );
    expect(updateOne.mock.calls[0][0]._id).toMatch(
      /^chat_timeout:\d{4}-\d{2}-\d{2}T\d{2}$/,
    );
  });

  it('sends only bounded metadata to GitHub and email', async () => {
    findOneAndUpdate.mockResolvedValue({
      _id: 'chat_timeout:2026-11-10T00',
      kind: 'chat_timeout',
      hour: '2026-11-10T00',
      createdAt: new Date(),
    });
    await service.tick();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const request = fetchMock.mock.calls[1][1];
    expect(JSON.parse(request?.body as string)).toEqual({
      title: '[운영 오류] chat_timeout 2026-11-10T00:00 UTC',
      body: '오류 유형: chat_timeout\n발생 시간대: 2026-11-10T00:00 UTC\n\n이 이슈에는 상담 내용과 사용자 정보를 포함하지 않습니다.',
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].text).toContain(
      'https://github.com/fullth/to-high/issues/123',
    );
  });

  it('sends email even when GitHub is unavailable', async () => {
    findOneAndUpdate.mockResolvedValue({
      _id: 'api_failure:2026-11-10T00',
      kind: 'api_failure',
      hour: '2026-11-10T00',
      createdAt: new Date(),
    });
    fetchMock.mockReset().mockRejectedValue(new Error('provider private text'));
    await service.tick();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(sendMail.mock.calls)).not.toContain(
      'provider private text',
    );
  });

  it('reuses an existing issue after an interrupted attempt', async () => {
    findOneAndUpdate.mockResolvedValue({
      _id: 'chat_timeout:2026-11-10T00',
      kind: 'chat_timeout',
      hour: '2026-11-10T00',
      createdAt: new Date(),
    });
    fetchMock.mockReset().mockResolvedValue({
      ok: true,
      json: async () => [{
        title: '[운영 오류] chat_timeout 2026-11-10T00:00 UTC',
        html_url: 'https://github.com/fullth/to-high/issues/123',
        user: { login: 'fullth' },
      }],
    } as Response);
    await service.tick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].text).toContain('https://github.com/fullth/to-high/issues/123');
  });
});
