import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BudgetController } from './budget.controller';
import { JwtStrategy } from '../../app/auth/strategy/jwt.strategy';
import { BudgetWalletRepository } from '../../common/budget-wallet.repository';
import { UsageOverviewService } from '../../common/usage-overview.service';
import type { BudgetWallet } from '../../common/budget-wallet';

describe('budget HTTP authorization', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let wallet: BudgetWallet;
  beforeAll(async () => {
    const config = {
      get: (key: string) =>
        ({
          JWT_SECRET: 'test-secret',
          TO_HIGH_BUDGET_ADMIN_USER_IDS: 'admin-id',
        })[key],
    };
    const repository = {
      transition: async (
        change: (state: BudgetWallet) => BudgetWallet | null,
      ) => {
        const next = change(wallet);
        if (next) wallet = next;
        return next;
      },
    };
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: 'test-secret' })],
      controllers: [BudgetController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: config },
        { provide: BudgetWalletRepository, useValue: repository },
        { provide: UsageOverviewService, useValue: { todayUsage: async () => ({ countedTurns: 7, signedInAccounts: 2, guestNetworks: 1 }) } },
      ],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    await app.init();
  });
  beforeEach(() => {
    wallet = {
      version: 0,
      balance: 0,
      reservations: {},
      evaluatedWeek: '2026-11-01T15:00:00.000Z',
    };
  });
  afterAll(async () => {
    await app.close();
  });
  it('requires both a valid token and an explicitly configured user id', async () => {
    await request(app.getHttpServer()).get('/admin/budget').expect(401);
    await request(app.getHttpServer())
      .get('/admin/budget')
      .set(
        'Authorization',
        `Bearer ${jwt.sign({ sub: 'other-id', email: 'admin@example.invalid' })}`,
      )
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/budget')
      .set(
        'Authorization',
        `Bearer ${jwt.sign({ sub: 'admin-id', email: 'admin@example.invalid' })}`,
      )
      .expect(200)
      .expect(({ body }) => { expect(body.todayUsage).toEqual({ countedTurns: 7, signedInAccounts: 2, guestNetworks: 1 }); });
  });
  it('validates input and safely handles a repeated topup', async () => {
    const token = jwt.sign({ sub: 'admin-id', email: 'admin@example.invalid' });
    await request(app.getHttpServer())
      .post('/admin/budget/topups')
      .set('Authorization', `Bearer ${token}`)
      .send({ amountWon: -1, operationId: 'a'.repeat(32) })
      .expect(400);
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .post('/admin/budget/topups')
        .set('Authorization', `Bearer ${token}`)
        .send({ amountWon: 10000, operationId: 'a'.repeat(32) })
        .expect(201);
    expect(wallet.balance).toBe(10_000_000);
  });
});
