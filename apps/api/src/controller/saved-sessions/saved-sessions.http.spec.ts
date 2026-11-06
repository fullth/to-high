import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtStrategy } from '../../app/auth/strategy/jwt.strategy';
import { SavedSessionsService } from '../../app/saved-sessions/saved-sessions.service';
import { SavedSessionsController } from './saved-sessions.controller';

describe('saved session HTTP authorization', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const sessions = { list: jest.fn().mockResolvedValue({ sessions: [] }), save: jest.fn().mockResolvedValue({ id: 'a'.repeat(32), title: '테스트' }), get: jest.fn(), delete: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: 'test-secret' })],
      controllers: [SavedSessionsController],
      providers: [JwtStrategy, { provide: ConfigService, useValue: { get: () => 'test-secret' } }, { provide: SavedSessionsService, useValue: sessions }],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  it('requires authentication and uses the authenticated owner', async () => {
    await request(app.getHttpServer()).get('/saved-sessions').expect(401);
    const token = jwt.sign({ sub: 'owner-a', email: 'test@example.invalid' });
    await request(app.getHttpServer()).get('/saved-sessions').set('Authorization', `Bearer ${token}`).expect(200);
    expect(sessions.list).toHaveBeenCalledWith('owner-a');
    await request(app.getHttpServer()).post('/saved-sessions').set('Authorization', `Bearer ${token}`).send({ id: 'a'.repeat(32), ownerId: 'owner-b', messages: [{ role: 'user', content: '합성 데이터' }] }).expect(400);
    expect(sessions.save).not.toHaveBeenCalled();
  });
});
