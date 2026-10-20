/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { Test } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { ChatController } from './chat.controller';
import { LegacyChatDisabledGuard } from '../../common/legacy-chat-disabled.guard';
import { ChatService } from '../../app/chat/chat.service';
import { GuestSessionGuard } from '../../common/guest-session.guard';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt.guard';
import { SessionRepository } from '../../persistence/session/session.repository';
const id = '507f1f77bcf86cd799439011',
  token = 'a'.repeat(64);
describe('chat HTTP ownership with mock auth/persistence', () => {
  let app: INestApplication, session: any;
  const service = {
    getSessionDetail: jest
      .fn()
      .mockResolvedValue({ context: ['private mock'] }),
    claimGuestSession: jest.fn().mockImplementation(async (_id, userId) => {
      session = { isGuest: false, userId: { toString: () => userId } };
      return { claimed: true };
    }),
    endSession: jest.fn(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        GuestSessionGuard,
        { provide: ChatService, useValue: service },
        {
          provide: SessionRepository,
          useValue: { findForAccess: async () => session },
        },
      ],
    })
      .overrideGuard(LegacyChatDisabledGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          if (req.headers['test-user'])
            req.user = { userId: req.headers['test-user'] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    session = {
      isGuest: true,
      guestAccessHash: createHash('sha256').update(token).digest('hex'),
      userId: { toString: () => 'guest' },
    };
  });
  afterAll(async () => {
    await app.close();
  });
  it('protects actual detail and mutation HTTP paths', async () => {
    await request(app.getHttpServer()).get(`/chat/sessions/${id}`).expect(404);
    expect(service.getSessionDetail).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get(`/chat/sessions/${id}`)
      .set('X-Guest-Token', token)
      .expect(200);
    for (const path of [
      'select/stream',
      'mode/stream',
      'message/stream',
      'end',
    ]) {
      await request(app.getHttpServer())
        .post(`/chat/${path}`)
        .set('X-Guest-Token', 'b'.repeat(64))
        .send({ sessionId: id })
        .expect(404);
    }
    expect(service.endSession).not.toHaveBeenCalled();
  });
  it('requires proof and login to claim, then denies old guest proof and strangers', async () => {
    const path = `/chat/sessions/${id}`;
    await request(app.getHttpServer())
      .post(`${path}/claim`)
      .set('test-user', 'owner')
      .expect(404);
    await request(app.getHttpServer())
      .post(`${path}/claim`)
      .set('X-Guest-Token', token)
      .expect(401);
    await request(app.getHttpServer())
      .post(`${path}/claim`)
      .set('test-user', 'owner')
      .set('X-Guest-Token', token)
      .expect(201);
    await request(app.getHttpServer())
      .get(path)
      .set('X-Guest-Token', token)
      .expect(404);
    await request(app.getHttpServer())
      .get(path)
      .set('test-user', 'stranger')
      .expect(404);
    await request(app.getHttpServer())
      .post(`${path}/claim`)
      .set('test-user', 'stranger')
      .set('X-Guest-Token', token)
      .expect(404);
    await request(app.getHttpServer())
      .get(path)
      .set('test-user', 'owner')
      .expect(200);
  });
});
