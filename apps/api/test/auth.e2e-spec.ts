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
import { UserRepository } from '../src/persistence/user/user.repository';
import { AuthService } from '../src/app/auth/auth.service';
import { JwtStrategy } from '../src/app/auth/strategy/jwt.strategy';
import { AuthController } from '../src/controller/auth/auth.controller';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let userModel: Model<UserDocument>;

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
        MongooseModule.forFeature([{ name: UserDocument.name, schema: UserSchema }]),
        PassportModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '7d' },
        }),
      ],
      controllers: [AuthController],
      providers: [AuthService, UserRepository, JwtStrategy],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(UserDocument.name));
    await app.init();
  });

  afterAll(async () => {
    await userModel.deleteMany({});
    await app.close();
  });

  describe('GET /auth/me', () => {
    it('인증 없이 접근 시 401 반환', async () => {
      // given
      // when
      const response = await request(app.getHttpServer()).get('/auth/me');

      // then
      expect(response.status).toBe(401);
    });

    it('유효한 JWT로 사용자 정보 조회', async () => {
      // given
      const user = await userModel.create({
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        googleId: 'google123',
      });
      const token = jwtService.sign({ sub: user._id, email: user.email });

      // when
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // then
      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
    });

    it('유효하지 않은 JWT로 접근 시 401 반환', async () => {
      // given
      const invalidToken = 'invalid.jwt.token';

      // when
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`);

      // then
      expect(response.status).toBe(401);
    });
  });
});
