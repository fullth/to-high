import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import passport from 'passport';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from '../../app/auth/auth.service';

// Synthetic provider: no IdP, SMTP, database or production keys are used.
describe('OAuth request binding over HTTP', () => {
  let app: INestApplication;
  const state = 'a'.repeat(64);
  const other = 'b'.repeat(64);
  const exchanges = jest.fn();
  const sign = jest.fn(() => 'synthetic-jwt');
  beforeAll(async () => {
    for (const name of ['google', 'kakao'])
      passport.use(name, {
        name,
        authenticate(req: any, options: any) {
          if (!req.path.endsWith('/callback'))
            return this.redirect(
              `https://provider.test/?state=${options.state}`,
            );
          exchanges();
          this.success({ userId: 'synthetic-owner' });
        },
      } as any);
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AuthController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                NODE_ENV: 'production',
                FRONTEND_URL: 'https://web.example.test',
              })[key],
          },
        },
        { provide: AuthService, useValue: { generateToken: sign } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
  });
  beforeEach(() => {
    exchanges.mockClear();
    sign.mockClear();
  });
  afterAll(async () => {
    await app.close();
  });
  describe.each(['google', 'kakao'])('%s', (provider) => {
    it('sets a short-lived HttpOnly Secure SameSite cookie and forwards state', async () => {
      const res = await request(app.getHttpServer())
        .get(`/auth/${provider}?state=${state}`)
        .expect(302);
      expect(res.headers.location).toBe(
        `https://provider.test/?state=${state}`,
      );
      const cookie = res.headers['set-cookie'][0];
      for (const part of [
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        'Max-Age=600',
        `Path=/auth/${provider}`,
      ])
        expect(cookie).toContain(part);
    });
    it('rejects missing, mismatched and cross-provider cookies before code exchange', async () => {
      for (const cookie of [
        '',
        `oauth_${provider}_state=${other}`,
        `oauth_${provider === 'google' ? 'kakao' : 'google'}_state=${state}`,
      ]) {
        const req = request(app.getHttpServer()).get(
          `/auth/${provider}/callback?code=dummy&state=${state}`,
        );
        if (cookie) req.set('Cookie', cookie);
        await req.expect(401);
      }
      await request(app.getHttpServer())
        .get(`/auth/${provider}/callback?code=dummy`)
        .expect(401);
      await request(app.getHttpServer())
        .get(`/auth/${provider}/callback/?code=dummy&state=${state}`)
        .expect(401);
      await request(app.getHttpServer())
        .get(
          `/auth/${provider}/callback?code=dummy&state=${state}&state=${state}`,
        )
        .set('Cookie', `oauth_${provider}_state=${state}`)
        .expect(401);
      expect(exchanges).not.toHaveBeenCalled();
      expect(sign).not.toHaveBeenCalled();
    });
    it('accepts a matching callback, clears its cookie and puts the token in the fragment', async () => {
      const res = await request(app.getHttpServer())
        .get(`/auth/${provider}/callback?code=dummy&state=${state}`)
        .set('Cookie', `oauth_${provider}_state=${state}`)
        .expect(302);
      const url = new URL(res.headers.location);
      expect(url.search).toBe('');
      expect(new URLSearchParams(url.hash.slice(1)).get('state')).toBe(state);
      expect(exchanges).toHaveBeenCalledTimes(1);
      expect(sign).toHaveBeenCalledTimes(1);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['set-cookie'][0]).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
    });
  });
});
