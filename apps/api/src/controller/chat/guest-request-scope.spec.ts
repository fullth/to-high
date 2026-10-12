/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { ChatController } from './chat.controller';
import { ChatService } from '../../app/chat/chat.service';
import { SessionService } from '../../app/session/session.service';
import { SessionRepository } from '../../persistence/session/session.repository';
import { UserRepository } from '../../persistence/user/user.repository';
import { UserProfileRepository } from '../../persistence/user-profile/user-profile.repository';
import { SessionDocument } from '../../database/session.schema';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { GuestSessionGuard } from '../../common/guest-session.guard';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt.guard';
import { ChatRequestLimitService } from '../../common/chat-request-limit.service';
const id = '507f1f77bcf86cd799439011',
  owner = '507f1f77bcf86cd799439012';
describe('real request-scoped ownership composition with in-memory model', () => {
  let app: INestApplication;
  let session: Record<string, any>;
  const matches = (filter: Record<string, any>): boolean =>
    Object.entries(filter).every(([key, value]) => {
      if (key === '$and') return value.every(matches);
      if (key === '$or') return value.some(matches);
      if (value && typeof value === 'object' && '$ne' in value)
        return session[key] !== value.$ne;
      return String(session[key]) === String(value);
    });
  const model = {
    create: (data: Record<string, unknown>) => {
      session = {
        ...data,
        _id: id,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      };
      return Promise.resolve(session);
    },
    findById: () => ({
      select: () => ({ exec: () => Promise.resolve(session) }),
    }),
    findOne: (filter: Record<string, unknown>) =>
      Promise.resolve(matches(filter) ? session : null),
    findOneAndUpdate: (
      filter: Record<string, any>,
      update: Record<string, any>,
    ) => {
      if (!matches(filter)) return Promise.resolve(null);
      if (update.$set) Object.assign(session, update.$set);
      if (update.$unset)
        for (const key of Object.keys(update.$unset)) delete session[key];
      if (update.$push)
        for (const [key, value] of Object.entries(update.$push))
          session[key].push(value);
      return Promise.resolve(session);
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        ChatService,
        SessionService,
        SessionRepository,
        GuestSessionGuard,
        ChatRequestLimitService,
        { provide: getModelToken(SessionDocument.name), useValue: model },
        { provide: UserRepository, useValue: {} },
        { provide: UserProfileRepository, useValue: {} },
        { provide: OpenAIAgent, useValue: {} },
      ],
    })
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
  afterAll(async () => {
    await app.close();
  });
  it('start saves hash, subsequent scoped query enforces it, claim revokes and owner succeeds', async () => {
    const started = await request(app.getHttpServer())
      .post('/chat/start')
      .send({ category: 'daily' })
      .expect(201);
    const proof = started.body.guestAccessToken as string;
    expect(proof).toMatch(/^[a-f0-9]{64}$/);
    expect(session.guestAccessHash).not.toBe(proof);
    await request(app.getHttpServer()).get(`/chat/sessions/${id}`).expect(404);
    const detail = await request(app.getHttpServer())
      .get(`/chat/sessions/${id}`)
      .set('X-Guest-Token', proof)
      .expect(200);
    expect(detail.body).not.toHaveProperty('guestAccessHash');
    await request(app.getHttpServer())
      .post(`/chat/sessions/${id}/claim`)
      .set('test-user', owner)
      .set('X-Guest-Token', proof)
      .expect(201);
    expect(session.guestAccessHash).toBeUndefined();
    await request(app.getHttpServer())
      .get(`/chat/sessions/${id}`)
      .set('X-Guest-Token', proof)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/chat/sessions/${id}`)
      .set('test-user', owner)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/chat/sessions/${id}/claim`)
      .set('test-user', owner)
      .expect(201);
  });
});
