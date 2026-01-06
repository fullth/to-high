import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { UserDocument, UserSchema } from '../src/database/user.schema';
import { SessionDocument, SessionSchema } from '../src/database/session.schema';
import { UserRepository } from '../src/persistence/user/user.repository';
import { SessionRepository } from '../src/persistence/session/session.repository';
import { AuthService } from '../src/app/auth/auth.service';
import { ChatService } from '../src/app/chat/chat.service';
import { SessionService } from '../src/app/session/session.service';
import { OpenAIAgent } from '../src/client/openai/openai.agent';
import { JwtStrategy } from '../src/app/auth/strategy/jwt.strategy';
import { ChatController } from '../src/controller/chat/chat.controller';

describe('ChatController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let userModel: Model<UserDocument>;
  let sessionModel: Model<SessionDocument>;
  let testUser: UserDocument;
  let authToken: string;

  const mockOpenAIAgent = {
    generateOptions: jest.fn().mockResolvedValue({
      question: '오늘 어떤 일이 있었나요?',
      options: ['직장 문제', '인간관계', '건강 문제'],
      canProceedToResponse: false,
    }),
    generateResponse: jest.fn().mockResolvedValue('힘들었겠다. 충분히 그럴 수 있어.'),
    summarizeSession: jest.fn().mockResolvedValue('직장 스트레스로 인한 상담'),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            MONGODB_URI: 'mongodb://localhost:27017/to-high-test',
            JWT_SECRET: 'test-secret',
          })],
        }),
        MongooseModule.forRoot('mongodb://localhost:27017/to-high-test'),
        MongooseModule.forFeature([
          { name: UserDocument.name, schema: UserSchema },
          { name: SessionDocument.name, schema: SessionSchema },
        ]),
        PassportModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '7d' },
        }),
      ],
      controllers: [ChatController],
      providers: [
        AuthService,
        ChatService,
        SessionService,
        UserRepository,
        SessionRepository,
        JwtStrategy,
        { provide: OpenAIAgent, useValue: mockOpenAIAgent },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(UserDocument.name));
    sessionModel = moduleFixture.get<Model<SessionDocument>>(getModelToken(SessionDocument.name));
    await app.init();
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
    await sessionModel.deleteMany({});
    jest.clearAllMocks();

    testUser = await userModel.create({
      email: 'chat-test@example.com',
      name: 'Chat Test User',
      picture: 'https://example.com/pic.jpg',
      googleId: 'google-chat-123',
    });
    authToken = jwtService.sign({ sub: testUser._id, email: testUser.email });
  });

  afterAll(async () => {
    await userModel.deleteMany({});
    await sessionModel.deleteMany({});
    await app.close();
  });

  describe('POST /chat/start', () => {
    it('인증 없이 접근 시 401 반환', async () => {
      // given
      // when
      const response = await request(app.getHttpServer())
        .post('/chat/start')
        .send({ category: '직장' });

      // then
      expect(response.status).toBe(401);
    });

    it('세션 시작 성공', async () => {
      // given
      // when
      const response = await request(app.getHttpServer())
        .post('/chat/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ category: '직장' });

      // then
      expect(response.status).toBe(201);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.question).toBe('오늘 어떤 일이 있었나요?');
      expect(response.body.options).toHaveLength(3);
    });

    it('category 없이 요청 시 400 반환', async () => {
      // given
      // when
      const response = await request(app.getHttpServer())
        .post('/chat/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // then
      expect(response.status).toBe(400);
    });
  });

  describe('POST /chat/select', () => {
    it('선택지 선택 성공', async () => {
      // given
      const session = await sessionModel.create({
        userId: testUser._id,
        context: ['카테고리: 직장'],
        category: '직장',
        status: 'active',
      });

      // when
      const response = await request(app.getHttpServer())
        .post('/chat/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: session._id.toString(), selectedOption: '직장 문제' });

      // then
      expect(response.status).toBe(201);
      expect(response.body.sessionId).toBe(session._id.toString());
    });

    it('canProceedToResponse가 true일 때 responseModes 반환', async () => {
      // given
      mockOpenAIAgent.generateOptions.mockResolvedValueOnce({
        question: null,
        options: null,
        canProceedToResponse: true,
      });
      const session = await sessionModel.create({
        userId: testUser._id,
        context: ['카테고리: 직장', '선택: 직장 문제'],
        category: '직장',
        status: 'active',
      });

      // when
      const response = await request(app.getHttpServer())
        .post('/chat/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: session._id.toString(), selectedOption: '상사와 갈등' });

      // then
      expect(response.status).toBe(201);
      expect(response.body.canProceedToResponse).toBe(true);
      expect(response.body.responseModes).toBeDefined();
    });
  });

  describe('POST /chat/mode', () => {
    it('응답 모드 설정 성공', async () => {
      // given
      const session = await sessionModel.create({
        userId: testUser._id,
        context: ['카테고리: 직장'],
        category: '직장',
        status: 'active',
      });

      // when
      const response = await request(app.getHttpServer())
        .post('/chat/mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: session._id.toString(), mode: 'comfort' });

      // then
      expect(response.status).toBe(201);
      expect(response.body.response).toBeDefined();
    });

    it('잘못된 mode 값 시 400 반환', async () => {
      // given
      const session = await sessionModel.create({
        userId: testUser._id,
        context: ['카테고리: 직장'],
        category: '직장',
        status: 'active',
      });

      // when
      const response = await request(app.getHttpServer())
        .post('/chat/mode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: session._id.toString(), mode: 'invalid' });

      // then
      expect(response.status).toBe(400);
    });
  });

  describe('POST /chat/message', () => {
    it('메시지 전송 성공', async () => {
      // given
      const session = await sessionModel.create({
        userId: testUser._id,
        context: ['카테고리: 직장'],
        category: '직장',
        status: 'active',
        responseMode: 'comfort',
      });

      // when
      const response = await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: session._id.toString(), message: '오늘 너무 힘들었어요' });

      // then
      expect(response.status).toBe(201);
      expect(response.body.response).toBe('힘들었겠다. 충분히 그럴 수 있어.');
    });
  });

  describe('POST /chat/end', () => {
    it('세션 종료 성공', async () => {
      // given
      const session = await sessionModel.create({
        userId: testUser._id,
        context: ['카테고리: 직장', '상담사: 힘들었겠다'],
        category: '직장',
        status: 'active',
        responseMode: 'comfort',
      });

      // when
      const response = await request(app.getHttpServer())
        .post('/chat/end')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: session._id.toString() });

      // then
      expect(response.status).toBe(201);
      expect(response.body.summary).toBe('직장 스트레스로 인한 상담');

      const updatedSession = await sessionModel.findById(session._id);
      expect(updatedSession?.status).toBe('completed');
    });
  });
});
