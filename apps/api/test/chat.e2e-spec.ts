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
import { UserProfileDocument, UserProfileSchema } from '../src/database/user-profile.schema';
import { UserRepository } from '../src/persistence/user/user.repository';
import { SessionRepository } from '../src/persistence/session/session.repository';
import { UserProfileRepository } from '../src/persistence/user-profile/user-profile.repository';
import { AuthService } from '../src/app/auth/auth.service';
import { ChatService } from '../src/app/chat/chat.service';
import { SessionService } from '../src/app/session/session.service';
import { OpenAIAgent } from '../src/client/openai/openai.agent';
import { JwtStrategy } from '../src/app/auth/strategy/jwt.strategy';
import { ChatController } from '../src/controller/chat/chat.controller';
import { NotificationService } from '../src/common/notification.service';
import { ChatRequestLimitService } from '../src/common/chat-request-limit.service';
import { INITIAL_OPTIONS, INITIAL_QUESTIONS } from '../src/prompts';

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
      canRequestFeedback: true,
    }),
    generateOptionsStream: jest.fn().mockImplementation(async function* () {
      // question 스트리밍
      const question = '오늘 어떤 일이 있었나요?';
      for (const char of question) {
        yield { type: 'question_chunk', content: char };
      }
      // options 전송
      yield {
        type: 'options',
        options: ['직장 문제', '인간관계', '건강 문제'],
        canProceedToResponse: false,
        canRequestFeedback: true,
      };
    }),
    generateResponseStream: jest.fn().mockImplementation(async function* () {
      const response = '힘들었겠다. 충분히 그럴 수 있어.';
      for (const char of response) {
        yield char;
      }
    }),
    summarizeSession: jest.fn().mockResolvedValue('직장 스트레스로 인한 상담'),
  };

  const mockNotificationService = {
    notifyNewUser: jest.fn().mockResolvedValue(undefined),
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
          { name: UserProfileDocument.name, schema: UserProfileSchema },
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
        ChatRequestLimitService,
        SessionService,
        UserRepository,
        SessionRepository,
        UserProfileRepository,
        JwtStrategy,
        { provide: OpenAIAgent, useValue: mockOpenAIAgent },
        { provide: NotificationService, useValue: mockNotificationService },
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
    it('로그인 없이 게스트 세션을 시작하고 고정 질문을 반환한다', async () => {
      // given
      // when
      const response = await request(app.getHttpServer())
        .post('/chat/start')
        .send({ category: 'work' });
      const body = response.body as {
        sessionId: string;
        question: string;
        options: string[];
      };

      // then
      expect(response.status).toBe(201);
      expect(body.question).toBe(INITIAL_QUESTIONS.work);
      expect(body.options).toEqual(INITIAL_OPTIONS.work);
      expect(body.options).toHaveLength(8);
      const session = await sessionModel.findById(body.sessionId);
      expect(session?.isGuest).toBe(true);
      expect(mockOpenAIAgent.generateOptions).not.toHaveBeenCalled();
    });

    it('세션 시작 성공', async () => {
      // given
      // when
      const response = await request(app.getHttpServer())
        .post('/chat/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ category: 'work' });
      const body = response.body as {
        sessionId: string;
        question: string;
        options: string[];
      };

      // then
      expect(response.status).toBe(201);
      expect(body.sessionId).toBeDefined();
      expect(body.question).toBe(INITIAL_QUESTIONS.work);
      expect(body.options).toEqual(INITIAL_OPTIONS.work);
      expect(body.options).toHaveLength(8);
      const session = await sessionModel.findById(body.sessionId);
      expect(session?.userId.toString()).toBe(testUser._id.toString());
      expect(session?.isGuest).toBe(false);
      expect(mockOpenAIAgent.generateOptions).not.toHaveBeenCalled();
    });

    it('카테고리와 직접 입력이 모두 없으면 400 반환', async () => {
      // given
      // when
      const response = await request(app.getHttpServer())
        .post('/chat/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // then
      expect(response.status).toBe(400);
    });

    it('지원하지 않는 category는 400을 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .post('/chat/start')
        .send({ category: '직장' });

      expect(response.status).toBe(400);
      expect(await sessionModel.countDocuments()).toBe(0);
    });
  });

  describe('POST /chat/select/stream', () => {
    it('선택지 선택 스트리밍 성공', async () => {
      // given
      const session = await sessionModel.create({
        userId: testUser._id,
        context: ['카테고리: work'],
        category: 'work',
        status: 'active',
      });

      // when
      const response = await request(app.getHttpServer())
        .post('/chat/select/stream')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session._id.toString(),
          selectedOption: '직장 문제',
        });

      // then
      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toBe('text/event-stream');

      const text = response.text;
      expect(text).toContain('data: {"type":"question_chunk"');
      expect(text).toContain('data: {"done":true}');
    });

    it('question_chunk와 next 타입 순서대로 전송', async () => {
      // given
      const session = await sessionModel.create({
        userId: testUser._id,
        context: ['카테고리: work'],
        category: 'work',
        status: 'active',
      });

      // when
      const response = await request(app.getHttpServer())
        .post('/chat/select/stream')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session._id.toString(),
          selectedOption: '직장 문제',
        });

      // then
      const lines = response.text
        .split('\n')
        .filter((line) => line.startsWith('data: '));
      type StreamEvent = {
        type?: string;
        content?: string;
        question?: string;
        options?: string[];
      };
      const chunks = lines
        .map((line): StreamEvent | null => {
          try {
            return JSON.parse(line.replace('data: ', '')) as StreamEvent;
          } catch {
            return null;
          }
        })
        .filter((chunk): chunk is StreamEvent => chunk !== null);

      const questionChunks = chunks.filter((c) => c.type === 'question_chunk');
      const nextChunk = chunks.find((c) => c.type === 'next');

      expect(questionChunks.length).toBeGreaterThan(0);
      expect(nextChunk).toBeDefined();
      expect(nextChunk?.question).toBe('오늘 어떤 일이 있었나요?');
      expect(questionChunks.map((chunk) => chunk.content).join('')).toBe(
        nextChunk?.question,
      );
      expect(
        chunks.findIndex((chunk) => chunk.type === 'next'),
      ).toBeGreaterThan(chunks.indexOf(questionChunks[0]));
      expect(nextChunk?.options).toEqual([
        '직장 문제',
        '인간관계',
        '건강 문제',
      ]);
    });
  });


  describe('POST /chat/end', () => {
    it('세션 종료 성공', async () => {
      // given
      const session = await sessionModel.create({
        userId: testUser._id,
        context: ['카테고리: work', '상담사: 힘드셨겠어요'],
        category: 'work',
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

    it('익명 요청으로 로그인 사용자의 세션을 종료할 수 없다', async () => {
      const session = await sessionModel.create({
        userId: testUser._id,
        isGuest: false,
        category: 'work',
        status: 'active',
      });
      const response = await request(app.getHttpServer())
        .post('/chat/end')
        .send({ sessionId: session._id.toString() });

      expect(response.status).toBe(404);
      expect((await sessionModel.findById(session._id))?.status).toBe('active');
      expect(mockOpenAIAgent.summarizeSession).not.toHaveBeenCalled();
    });
  });
});
