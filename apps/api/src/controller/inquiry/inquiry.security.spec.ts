import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { InquiryController } from './inquiry.controller';
import { InquiryService } from '../../app/inquiry/inquiry.service';
import { InquiryDocument } from '../../database/inquiry.schema';
import { JwtStrategy } from '../../app/auth/strategy/jwt.strategy';

describe('Inquiry ownership over HTTP', () => {
  let app: INestApplication;
  const jwt = new JwtService({ secret: 'synthetic-test-secret' });
  let rows: any[];
  const model = {
    findOne: jest.fn(async (query) =>
      rows.find(
        (row) =>
          row._id === query._id &&
          (query.userId === null
            ? row.userId == null
            : row.userId === query.userId),
      ),
    ),
    create: jest.fn(async (data) => ({ ...data, _id: 'new-inquiry' })),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [InquiryController],
      providers: [
        InquiryService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: () => 'synthetic-test-secret' },
        },
        { provide: getModelToken(InquiryDocument.name), useValue: model },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    rows = [
      {
        _id: 'owned',
        userId: 'owner',
        status: 'open',
        messages: [],
        save: jest.fn(),
      },
      { _id: 'guest', status: 'open', messages: [], save: jest.fn() },
    ];
  });
  afterAll(async () => {
    await app.close();
  });
  it('guests and other accounts cannot append to or read back an owned thread', async () => {
    for (const token of [null, jwt.sign({ sub: 'other' })]) {
      const req = request(app.getHttpServer()).post('/inquiry/owned/message');
      if (token) req.set('Authorization', `Bearer ${token}`);
      const res = await req.send({ message: 'synthetic message' });
      expect(res.status).toBe(404);
      expect(res.body.messages).toBeUndefined();
    }
    expect(rows[0].messages).toEqual([]);
    expect(rows[0].save).not.toHaveBeenCalled();
  });
  it('allows the authenticated owner and preserves guest-only continuation', async () => {
    await request(app.getHttpServer())
      .post('/inquiry/owned/message')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 'owner' })}`)
      .send({ message: 'owner reply' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/inquiry/guest/message')
      .send({ message: 'guest reply' })
      .expect(201);
    expect(rows.map((row) => row.messages[0].content)).toEqual([
      'owner reply',
      'guest reply',
    ]);
  });
  it('rejects invalid credentials instead of silently falling back to guest', async () => {
    await request(app.getHttpServer())
      .post('/inquiry/guest/message')
      .set('Authorization', 'Bearer invalid')
      .send({ message: 'reply' })
      .expect(401);
    expect(model.findOne).not.toHaveBeenCalled();
  });
  it('assigns authenticated ownership when creating an inquiry', async () => {
    await request(app.getHttpServer())
      .post('/inquiry')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 'owner' })}`)
      .send({ type: 'contact', message: 'question' })
      .expect(201);
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'owner' }),
    );
  });
});
