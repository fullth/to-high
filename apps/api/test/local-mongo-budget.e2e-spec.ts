import { randomUUID } from 'node:crypto';
import mongoose, { Connection } from 'mongoose';
import { BudgetWalletRepository } from '../src/common/budget-wallet.repository';
import {
  chargeBudget,
  reserveBudget,
  settleBudget,
} from '../src/common/budget-wallet';
import { BudgetAlertService } from '../src/common/budget-alert.service';
import { ModelBudgetService } from '../src/common/model-budget.service';
import { OpenAIAgent } from '../src/client/openai/openai.agent';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { DailyTurnLimitService } from '../src/common/daily-turn-limit.service';
import { SavedSessionsService } from '../src/app/saved-sessions/saved-sessions.service';
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const run = process.env.TO_HIGH_ISOLATED_DB === '1' ? describe : describe.skip;
const database = `codex_to_high_test_${randomUUID().replace(/-/g, '')}`;

run('shared budget wallet in isolated MongoDB', () => {
  let connection: Connection;
  beforeAll(async () => {
    const port = Number(process.env.TO_HIGH_TEST_MONGO_PORT);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new Error('Isolated loopback test port required');
    connection = await mongoose
      .createConnection(`mongodb://127.0.0.1:${port}/${database}`, {
        serverSelectionTimeoutMS: 5000,
      })
      .asPromise();
  });
  it('keeps explicitly saved conversations isolated by account and supports deletion', async () => {
    const agent = { generateSavedSessionTitle: jest.fn().mockResolvedValue('일과 관계 고민') };
    const sessions = new SavedSessionsService(connection, agent as never);
    const id = 'c'.repeat(32);
    const messages = [{ role: 'user' as const, content: '합성 테스트 대화' }];
    await Promise.all(Array.from({ length: 5 }, () => sessions.save('owner-a', { id, messages })));
    expect(await sessions.save('owner-a', { id, messages })).toEqual({ id, title: '일과 관계 고민' });
    expect(agent.generateSavedSessionTitle).toHaveBeenCalledTimes(1);
    expect((await sessions.list('owner-b')).sessions).toEqual([]);
    await expect(sessions.get('owner-b', id)).rejects.toThrow();
    await expect(sessions.delete('owner-b', id)).rejects.toThrow();
    expect((await sessions.get('owner-a', id)).messages).toEqual(messages);
    expect(JSON.stringify(await sessions.list('owner-a'))).not.toContain('합성 테스트 대화');
    await sessions.delete('owner-a', id);
    await expect(sessions.get('owner-a', id)).rejects.toThrow();
  });
  afterAll(async () => {
    if (connection) {
      if (
        connection.name !== database ||
        !database.startsWith('codex_to_high_test_')
      )
        throw new Error('Refusing unexpected database cleanup');
      await connection.dropDatabase();
      await connection.close();
    }
  });
  it('limits guest browsers permanently and user accounts by Korea calendar day', async () => {
    const extension = jest.fn().mockResolvedValue(undefined);
    const service = new DailyTurnLimitService(
      connection,
      { get: () => 'synthetic-secret' } as never,
      { extension } as never,
    );
    await service.onModuleInit();
    const at = new Date('2026-11-04T14:59:00Z');
    const browser = 'a'.repeat(32);
    const outcomes = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        service.consume(undefined, '192.0.2.1', browser, at),
      ),
    );
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(
      5,
    );
    const beforeBlocked = await connection
      .db!.collection('guest_browser_limits')
      .countDocuments();
    await expect(
      service.consume(undefined, '192.0.2.1', 'b'.repeat(32), at),
    ).rejects.toThrow();
    expect(
      await connection.db!.collection('guest_browser_limits').countDocuments(),
    ).toBe(beforeBlocked);
    await expect(
      service.consume(undefined, '192.0.2.2', browser, at),
    ).rejects.toThrow();
    const loggedIn = await Promise.allSettled(
      Array.from({ length: 22 }, () =>
        service.consume('synthetic-user', '192.0.2.1', undefined, at),
      ),
    );
    expect(loggedIn.filter((item) => item.status === 'fulfilled')).toHaveLength(
      20,
    );
    const nextDay = new Date('2026-11-04T15:00:00Z');
    await expect(
      service.consume(undefined, '192.0.2.1', browser, nextDay),
    ).rejects.toThrow();
    await expect(
      service.consume(undefined, '192.0.2.1', 'b'.repeat(32), nextDay),
    ).resolves.toBeUndefined();
    await expect(
      service.consume('synthetic-user', '192.0.2.1', undefined, nextDay),
    ).resolves.toBeUndefined();
    expect(extension).toHaveBeenCalled();
    const stored = JSON.stringify(
      await connection.db!.collection('daily_turn_limits').find({}).toArray(),
    );
    expect(stored).not.toContain('192.0.2.1');
    expect(stored).not.toContain('synthetic-user');
    expect(stored).not.toContain(browser);
  });
  it('serializes competing reservations and settlements from independent instances', async () => {
    const repositories = [
      new BudgetWalletRepository(connection),
      new BudgetWalletRepository(connection),
    ];
    const reserved = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        repositories[i % 2].transition((wallet) =>
          reserveBudget(wallet, `call-${i}`, 1_000_000),
        ),
      ),
    );
    expect(reserved.filter(Boolean)).toHaveLength(10);
    expect(
      await repositories[0].transition((wallet) =>
        reserveBudget(wallet, 'overflow', 1),
      ),
    ).toBeNull();
    expect((await repositories[1].read()).balance).toBe(0);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        repositories[i % 2].transition((wallet) =>
          settleBudget(wallet, `call-${i}`, 500_000),
        ),
      ),
    );
    const final = await repositories[0].read();
    expect(final.balance).toBe(5_000_000);
    expect(final.reservations).toEqual({});
  });
  it('sends a low-balance alert once across two workers and retains failed alerts for retry', async () => {
    const repository = new BudgetWalletRepository(connection);
    await connection
      .db!.collection('ai_budget_wallet')
      .updateOne({ _id: 'weekly-wallet' } as never, {
        $set: { balance: 1_000_000 },
      });
    const sendMail = jest.fn().mockResolvedValue({});
    jest
      .mocked(nodemailer.createTransport)
      .mockReturnValue({ sendMail } as never);
    const config = {
      get: (key: string) =>
        ({
          GMAIL_USER: 'sender@example.invalid',
          GMAIL_APP_PASSWORD: 'test-only',
          BUDGET_ALERT_RECIPIENT: 'admin@example.invalid',
        })[key],
    } as ConfigService;
    const workers = [
      new BudgetAlertService(connection, repository, config),
      new BudgetAlertService(connection, repository, config),
    ];
    try {
      await Promise.all(workers.map((worker) => worker.tick()));
      await Promise.all(workers.map((worker) => worker.tick()));
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail.mock.calls[0][0].to).toBe('admin@example.invalid');
      sendMail.mockRejectedValueOnce(new Error('mock error'));
      await workers[0].blocked(0);
      await workers[0].tick();
      const pending = await connection
        .db!.collection('ai_budget_alert_outbox')
        .findOne({ _id: 'blocked-0' } as never);
      expect(pending?.state).toBe('pending');
      await connection
        .db!.collection('ai_budget_alert_outbox')
        .updateOne({ _id: 'blocked-0' } as never, {
          $set: { leaseUntil: new Date(0) },
        });
      await workers[1].tick();
      const retried = await connection
        .db!.collection('ai_budget_alert_outbox')
        .findOne({ _id: 'blocked-0' } as never);
      expect(retried?.state).toBe('sent');
      expect(sendMail).toHaveBeenCalledTimes(3);
      await Promise.all(
        workers.map((worker) => worker.extension('2026-11-04')),
      );
      await workers[0].tick();
      const extension = await connection
        .db!.collection('ai_budget_alert_outbox')
        .findOne({ _id: 'extension-2026-11-04' } as never);
      expect(extension?.state).toBe('sent');
      expect(sendMail).toHaveBeenCalledTimes(4);
      expect(sendMail.mock.calls[3][0].subject).toContain('연장 요청');
      await Promise.all(workers.map((worker) => worker.reportProblem()));
      await workers[0].tick();
      expect(sendMail).toHaveBeenCalledTimes(5);
      expect(sendMail.mock.calls[4][0].subject).toContain('서비스 문제 알림');
      await expect(workers[0].reportProblem()).resolves.toBe('sent');
    } finally {
      jest.mocked(nodemailer.createTransport).mockReset();
    }
  });
  it('blocks model dispatch without a balance and settles successful mock usage', async () => {
    const repository = new BudgetWalletRepository(connection);
    await connection
      .db!.collection('ai_budget_wallet')
      .updateOne({ _id: 'weekly-wallet' } as never, {
        $set: { balance: 0, reservations: {} },
      });
    const config = {
      get: (key: string) => (key === 'OPENAI_API_KEY' ? 'test-key' : undefined),
    } as unknown as ConfigService;
    const blocked = jest.fn().mockResolvedValue(undefined);
    const budget = new ModelBudgetService(repository, config, {
      blocked,
    } as never);
    const agent = new OpenAIAgent(config, budget);
    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: '안녕하세요' } }],
      usage: {
        prompt_tokens: 1000,
        completion_tokens: 100,
        total_tokens: 1100,
        prompt_tokens_details: { cached_tokens: 0 },
      },
    });
    (agent as any).openai.chat.completions.create = create;
    await expect(agent.generateResponse([], 'comfort')).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
    expect(blocked).toHaveBeenCalled();
    await repository.transition((wallet) => chargeBudget(wallet, 1_000_000));
    await expect(agent.generateResponse([], 'comfort')).resolves.toBe(
      '안녕하세요',
    );
    expect(create).toHaveBeenCalledTimes(1);
    const wallet = await repository.read();
    expect(wallet.reservations).toEqual({});
    expect(wallet.balance).toBeLessThan(1_000_000);
  });
});
