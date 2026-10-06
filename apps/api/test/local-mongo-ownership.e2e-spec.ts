/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import mongoose, { Connection, Model, Types } from 'mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { SessionSchema, SessionDocument } from '../src/database/session.schema';
import { SessionRepository } from '../src/persistence/session/session.repository';
import { ChatController } from '../src/controller/chat/chat.controller';
import { ChatService } from '../src/app/chat/chat.service';
import { SessionService } from '../src/app/session/session.service';
import { UserRepository } from '../src/persistence/user/user.repository';
import { UserProfileRepository } from '../src/persistence/user-profile/user-profile.repository';
import { OpenAIAgent } from '../src/client/openai/openai.agent';
import { GuestSessionGuard } from '../src/common/guest-session.guard';
import { ChatRequestLimitService } from '../src/common/chat-request-limit.service';
import { JwtStrategy } from '../src/app/auth/strategy/jwt.strategy';

// Never read MONGODB_URI or app env files: only a separately allocated loopback
// test port is accepted, and database names are generated uniquely for this run.
const port = Number(process.env.TO_HIGH_TEST_MONGO_PORT);
const enabled = process.env.TO_HIGH_ISOLATED_DB === '1';
const run = enabled ? describe : describe.skip;
const database = `codex_to_high_test_${randomUUID().replace(/-/g, '')}`;
const token = randomBytes(32).toString('hex');
const hash = createHash('sha256').update(token).digest('hex');
const owner = new Types.ObjectId().toHexString();
const stranger = new Types.ObjectId().toHexString();
const jwt = new JwtService({
  secret: 'isolated-test-secret-never-used-in-app',
});
const login = (id: string) =>
  jwt.sign({ sub: id, email: 'test@example.invalid' });
run('isolated real MongoDB ownership and replica races', () => {
  let connection: Connection;
  let model: Model<SessionDocument>;
  let apps: INestApplication[] = [];
  let releaseStream: () => void = () => {};
  let streamStarted: () => void = () => {};
  let gate: Promise<void> = Promise.resolve();
  const agent = {
    generateOptionsStream: async function* () {
      streamStarted();
      await gate;
      yield { type: 'question_chunk', content: 'must-not-send-after-claim' };
      yield {
        type: 'options',
        options: ['정리해주세요'],
        canProceedToResponse: true,
      };
    },
  };
  const repo = (userId?: string, proof?: string, claim = false) =>
    new SessionRepository(model, {
      ...(userId && { user: { userId } }),
      headers: proof ? { 'x-guest-token': proof } : {},
      ...(claim && { route: { path: '/chat/sessions/:sessionId/claim' } }),
    });
  const fixture = () =>
    model.create({
      userId: new Types.ObjectId(),
      isGuest: true,
      guestAccessHash: hash,
      expireAt: new Date(Date.now() + 86400000),
      category: 'daily',
      context: ['mock-context'],
      fullContext: ['mock-context'],
    });
  beforeAll(async () => {
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new Error('Provide the isolated loopback container port');
    connection = await mongoose
      .createConnection(`mongodb://127.0.0.1:${port}/${database}`, {
        serverSelectionTimeoutMS: 5000,
      })
      .asPromise();
    model = connection.model(SessionDocument.name, SessionSchema);
    await model.init();
    for (let replica = 0; replica < 2; replica++) {
      const module = await Test.createTestingModule({
        imports: [PassportModule],
        controllers: [ChatController],
        providers: [
          ChatService,
          SessionService,
          SessionRepository,
          GuestSessionGuard,
          ChatRequestLimitService,
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: { get: () => 'isolated-test-secret-never-used-in-app' },
          },
          { provide: getModelToken(SessionDocument.name), useValue: model },
          { provide: UserRepository, useValue: {} },
          { provide: UserProfileRepository, useValue: {} },
          { provide: OpenAIAgent, useValue: agent },
        ],
      }).compile();
      const app = module.createNestApplication();
      await app.init();
      await app.listen(0, '127.0.0.1');
      apps.push(app);
    }
  });
  afterAll(async () => {
    releaseStream();
    await Promise.all(apps.map((app) => app.close()));
    apps = [];
    if (connection) {
      // This test can only drop its generated database on its test connection.
      if (
        connection.name !== database ||
        !database.startsWith('codex_to_high_test_')
      )
        throw new Error('Refuse cleanup of another database');
      await connection.dropDatabase();
      await connection.close();
    }
  });
  it('requires guest proof on real Mongo reads and never returns the hash', async () => {
    const session = await fixture();
    const id = session.id;
    await expect(repo().findById(id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      repo(undefined, 'b'.repeat(64)).findById(id),
    ).rejects.toBeInstanceOf(NotFoundException);
    const found = await repo(undefined, token).findById(id);
    expect(found?.guestAccessHash).toBeUndefined();
    expect(found?.context).toEqual(['mock-context']);
    const otherSession = await model.create({
      userId: new Types.ObjectId(),
      isGuest: true,
      guestAccessHash: createHash('sha256')
        .update(randomBytes(32).toString('hex'))
        .digest('hex'),
    });
    await expect(
      repo(undefined, token).findById(otherSession.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    const legacy = await model.create({
      userId: new Types.ObjectId(),
      isGuest: true,
    });
    await expect(
      repo(undefined, token).findById(legacy.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('permits legacy login documents only for their real owner', async () => {
    const id = new Types.ObjectId();
    await model.collection.insertOne({
      _id: id,
      userId: new Types.ObjectId(owner),
      context: [],
      fullContext: [],
    });
    await expect(
      repo(stranger, token).findById(id.toHexString()),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      repo(owner).findById(id.toHexString()),
    ).resolves.not.toBeNull();
  });
  it('two independent repository claims have exactly one atomic winner', async () => {
    const session = await fixture();
    const id = session.id;
    const claims = await Promise.all([
      repo(owner, token, true).claimGuestSession(id, owner),
      repo(stranger, token, true).claimGuestSession(id, stranger),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const stored = await model.findById(id).select('+guestAccessHash');
    expect(stored?.isGuest).toBe(false);
    expect(stored?.guestAccessHash).toBeUndefined();
    expect(stored?.expireAt).toBeUndefined();
    await expect(
      repo(undefined, token).getSessionDetail(id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('two independent HTTP replicas cannot assign one guest to two accounts', async () => {
    const session = await fixture();
    const id = session.id;
    const results = await Promise.all(
      [owner, stranger].map((userId, index) =>
        request(apps[index].getHttpServer())
          .post(`/chat/sessions/${id}/claim`)
          .set('Authorization', `Bearer ${login(userId)}`)
          .set('X-Guest-Token', token),
      ),
    );
    expect(
      results.filter(
        (response) => response.status === 201 && response.body.claimed === true,
      ),
    ).toHaveLength(1);
    const stored = await model.findById(id);
    const winning = stored!.userId.toHexString();
    expect([owner, stranger]).toContain(winning);
    const other = winning === owner ? stranger : owner;
    await request(apps[0].getHttpServer())
      .post(`/chat/sessions/${id}/claim`)
      .set('Authorization', `Bearer ${login(winning)}`)
      .expect(201);
    await request(apps[1].getHttpServer())
      .post(`/chat/sessions/${id}/claim`)
      .set('Authorization', `Bearer ${login(other)}`)
      .set('X-Guest-Token', token)
      .expect(404);
  });
  it('a stale pre-claim guest repository cannot read, write, reopen, save or change mode after claim', async () => {
    const session = await fixture();
    const id = session.id;
    const stale = repo(undefined, token);
    await stale.findById(id);
    await repo(owner, token, true).claimGuestSession(id, owner);
    for (const operation of [
      () => stale.findById(id),
      () => stale.getSessionDetail(id),
      () => stale.addContext(id, 'forbidden'),
      () => stale.complete(id, 'forbidden'),
      () => stale.reactivate(id),
      () => stale.saveSession(id),
      () => stale.setResponseMode(id, 'comfort'),
      () => stale.updateRollingSummary(id, 'forbidden', []),
      () => stale.updateAlias(id, owner, 'forbidden'),
      () => stale.deleteSession(id, owner),
    ]) {
      await expect(operation()).rejects.toBeInstanceOf(NotFoundException);
    }
    expect((await model.findById(id))?.context).toEqual(['mock-context']);
  });
  it('concurrent guest write and claim remain linearizable across independent repositories (20 runs)', async () => {
    for (let iteration = 0; iteration < 20; iteration++) {
      const session = await fixture();
      const id = session.id;
      const guest = repo(undefined, token);
      const [write, claim] = await Promise.allSettled([
        guest.addContext(id, 'authorized-before-claim'),
        repo(owner, token, true).claimGuestSession(id, owner),
      ]);
      expect(claim.status).toBe('fulfilled');
      const stored = await model.findById(id);
      expect(stored?.isGuest).toBe(false);
      const expected =
        write.status === 'fulfilled'
          ? ['mock-context', 'authorized-before-claim']
          : ['mock-context'];
      expect(stored?.context).toEqual(expected);
      await expect(
        guest.addContext(id, 'forbidden-after-claim'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect((await model.findById(id))?.context).toEqual(expected);
    }
  });
  it('actual HTTP + signed local JWT claim revokes proof and preserves the owner screen data', async () => {
    const http = request(apps[0].getHttpServer());
    const started = await http
      .post('/chat/start')
      .send({ category: 'daily' })
      .expect(201);
    const id = started.body.sessionId as string,
      proof = started.body.guestAccessToken as string;
    await http
      .get(`/chat/sessions/${id}`)
      .set('X-Guest-Token', proof)
      .expect(200);
    await http
      .post(`/chat/sessions/${id}/claim`)
      .set('X-Guest-Token', proof)
      .expect(401);
    await http
      .post(`/chat/sessions/${id}/claim`)
      .set('Authorization', `Bearer ${login(owner)}`)
      .expect(404);
    await http
      .post(`/chat/sessions/${id}/claim`)
      .set('Authorization', `Bearer ${login(owner)}`)
      .set('X-Guest-Token', proof)
      .expect(201);
    await http
      .get(`/chat/sessions/${id}`)
      .set('X-Guest-Token', proof)
      .expect(404);
    await http
      .get(`/chat/sessions/${id}`)
      .set('Authorization', `Bearer ${login(stranger)}`)
      .expect(404);
    const owned = await http
      .get(`/chat/sessions/${id}`)
      .set('Authorization', `Bearer ${login(owner)}`)
      .expect(200);
    expect(owned.body.context).toContain('카테고리: daily');
    await http
      .post(`/chat/sessions/${id}/claim`)
      .set('Authorization', `Bearer ${login(owner)}`)
      .expect(201);
  });
  it('claim on a second HTTP replica interrupts the first guest stream before its next chunk', async () => {
    const session = await fixture();
    const id = session.id;
    const entered = new Promise<void>((resolve) => {
      streamStarted = resolve;
    });
    gate = new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    const pending = request(apps[0].getHttpServer())
      .post('/chat/select/stream')
      .set('X-Guest-Token', token)
      .send({ sessionId: id, selectedOption: '테스트 고민이 있어요' })
      .then((response) => response);
    await entered;
    try {
      await request(apps[1].getHttpServer())
        .post(`/chat/sessions/${id}/claim`)
        .set('Authorization', `Bearer ${login(owner)}`)
        .set('X-Guest-Token', token)
        .expect(201);
    } finally {
      releaseStream();
    }
    const result = await pending;
    expect(result.text).not.toContain('must-not-send-after-claim');
    expect(result.text).toContain('error');
    expect(
      (await model.findById(id))?.fullContext.some((entry) =>
        entry.includes('must-not-send-after-claim'),
      ),
    ).toBe(false);
    gate = Promise.resolve();
    streamStarted = () => {};
  });
});
