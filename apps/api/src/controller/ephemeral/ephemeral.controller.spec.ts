import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { EphemeralController } from './ephemeral.controller';
import { EphemeralService } from '../../app/ephemeral/ephemeral.service';
import { EphemeralBudgetService } from '../../common/ephemeral-budget.service';

describe('ephemeral request lifecycle', () => {
  const body = {
    messages: [{ role: 'user' as const, content: '고민이 있어요' }],
    style: 'F' as const,
    mode: 'comfort' as const,
  };
  function setup(respond: jest.Mock) {
    const release = jest.fn();
    const acquireOwner = jest.fn().mockReturnValue(release);
    const controller = new EphemeralController(
      { respond } as unknown as EphemeralService,
      { acquireOwner } as unknown as EphemeralBudgetService,
    );
    const response = Object.assign(new EventEmitter(), {
      setHeader: jest.fn(),
      writableEnded: false,
    });
    const request = {
      user: { userId: 'verified-owner' },
      ip: '127.0.0.1',
    } as Request & { user: { userId: string } };
    return { controller, response, request, release, acquireOwner };
  }
  it('uses trusted identity, marks no-store and releases on errors', async () => {
    const { controller, response, request, release, acquireOwner } = setup(
      jest.fn().mockRejectedValue(new Error('safe failure')),
    );
    await expect(
      controller.respond(body, request, response as unknown as Response),
    ).rejects.toThrow();
    expect(acquireOwner).toHaveBeenCalledWith('verified-owner', '127.0.0.1');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
    expect(release).toHaveBeenCalledTimes(1);
    expect(response.listenerCount('close')).toBe(0);
  });
  it('propagates connection cancellation and releases once', async () => {
    const respond = jest
      .fn()
      .mockImplementation(
        (_body, _user, signal: AbortSignal) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener('abort', () =>
              reject(new Error('cancelled')),
            ),
          ),
      );
    const { controller, response, request, release } = setup(respond);
    const pending = controller.respond(
      body,
      request,
      response as unknown as Response,
    );
    const failure = expect(pending).rejects.toThrow('cancelled');
    response.emit('close');
    await failure;
    expect(release).toHaveBeenCalledTimes(1);
  });
});
