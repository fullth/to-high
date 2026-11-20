import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../../app/auth/strategy/jwt.strategy';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { StartOptionsController } from './start-options.controller';
import { StartOptionsRequestSchema } from './start-options.request';
import { StartOptionsService } from '../../app/ephemeral/start-options.service';
import { EphemeralBudgetService } from '../../common/ephemeral-budget.service';
describe('initial option boundary and lifecycle', () => {
  it.each([
    { context: 'https://arbitrary.invalid/' },
    { context: 'ticketing', url: 'private' },
    { context: 'general', previous: Array(6).fill('이전 선택지') },
    { context: 'general', previous: ['가'.repeat(81)] },
  ])('rejects uncontrolled context and oversized input', (input) =>
    expect(StartOptionsRequestSchema.safeParse(input).success).toBe(false),
  );
  function setup(generate: jest.Mock) {
    const release = jest.fn();
    const acquireOwner = jest.fn(() => release);
    const controller = new StartOptionsController(
      { generate } as unknown as StartOptionsService,
      { acquireOwner } as unknown as EphemeralBudgetService,
    );
    const response = Object.assign(new EventEmitter(), {
      writableEnded: false,
      setHeader: jest.fn(),
      json: jest.fn(),
    });
    const req = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as Request;
    return { controller, response, req, release, acquireOwner };
  }
  it('uses preview budget scope and releases on success without charging a counseling turn', async () => {
    const generate = jest
      .fn()
      .mockResolvedValue({ options: ['하나', '둘', '셋', '넷'] });
    const s = setup(generate);
    await s.controller.generate(
      { context: 'general', previous: [] },
      s.req,
      s.response as unknown as Response,
    );
    expect(s.acquireOwner).toHaveBeenCalledWith(
      undefined,
      '127.0.0.1',
      'start-options',
    );
    expect(s.response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
    expect(s.release).toHaveBeenCalledTimes(1);
    expect(s.response.listenerCount('close')).toBe(0);
  });
  it('propagates disconnect cancellation and always releases the slot', async () => {
    let signal: AbortSignal | undefined;
    const generate = jest.fn(
      (_context: unknown, _previous: unknown, s: AbortSignal) => {
        signal = s;
        return new Promise((_resolve, reject) =>
          s.addEventListener('abort', () => reject(new Error('cancelled')), {
            once: true,
          }),
        );
      },
    );
    const s = setup(generate);
    const pending = s.controller.generate(
      { context: 'ticketing', previous: [] },
      s.req,
      s.response as unknown as Response,
    );
    const rejected = expect(pending).rejects.toThrow('cancelled');
    s.response.emit('close');
    await rejected;
    expect(signal?.aborted).toBe(true);
    expect(s.release).toHaveBeenCalledTimes(1);
    expect(s.response.json).not.toHaveBeenCalled();
  });
});

// HTTP fixture uses mocked generation and no database or model provider.
describe('initial options HTTP contract', () => {
  let app: INestApplication;
  const original = process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT;
  const generate = jest.fn();
  beforeEach(async () => {
    process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT = '100';
    generate.mockReset().mockResolvedValue({
      options: ['하나예요', '둘이에요', '셋이에요', '넷이에요'],
    });
    const module = await Test.createTestingModule({
      controllers: [StartOptionsController],
      providers: [
        { provide: StartOptionsService, useValue: { generate } },
        EphemeralBudgetService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: () => 'synthetic-start-options-test-secret' },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    if (original === undefined)
      delete process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT;
    else process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT = original;
  });
  it('accepts guest generation and sends only validated context to the service', async () => {
    await request(app.getHttpServer())
      .post('/ephemeral/start-options')
      .send({ context: 'ticketing' })
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(generate).toHaveBeenCalledWith(
      'ticketing',
      [],
      expect.any(AbortSignal),
      undefined,
    );
  });
  it('rejects arbitrary advertisement and URL input before model dispatch', async () => {
    await request(app.getHttpServer())
      .post('/ephemeral/start-options')
      .send({
        context: 'ticketing',
        advertisement: 'untrusted',
        url: 'https://private.invalid',
      })
      .expect(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it('bounds repeated preview calls even when the generation succeeds', async () => {
    for (let index = 0; index < 5; index++)
      await request(app.getHttpServer())
        .post('/ephemeral/start-options')
        .send({ context: 'general' })
        .expect(200);
    await request(app.getHttpServer())
      .post('/ephemeral/start-options')
      .send({ context: 'general' })
      .expect(429);
    expect(generate).toHaveBeenCalledTimes(5);
  });
});
