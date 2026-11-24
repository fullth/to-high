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
    const record = jest.fn().mockResolvedValue(undefined);
    const journeyRecord = jest.fn().mockResolvedValue(undefined);
    const controller = new EphemeralController(
      { respond } as unknown as EphemeralService,
      { acquireOwner } as unknown as EphemeralBudgetService,
      { consume: jest.fn().mockResolvedValue(undefined) } as never,
      undefined, { record } as never, { record: journeyRecord } as never,
    );
    const response = Object.assign(new EventEmitter(), {
      setHeader: jest.fn(),
      writableEnded: false,
      headersSent: false,
      write: jest.fn(),
      json: jest.fn(),
      flushHeaders: jest.fn().mockImplementation(() => {
        response.headersSent = true;
      }),
      end: jest.fn().mockImplementation(() => {
        response.writableEnded = true;
      }),
    });
    const request = {
      user: { userId: 'verified-owner' },
      ip: '127.0.0.1',
    } as Request & { user: { userId: string } };
    return { controller, response, request, release, acquireOwner, record, journeyRecord };
  }
  it('counts success only after the response completes and never passes counseling content to metrics', async () => {
    const { controller, response, request, record } = setup(jest.fn().mockResolvedValue({ reply: '합성 답변' }));
    await controller.respond(body, request, response as unknown as Response);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'ok', firstTurn: true, rejected: false, userId: 'verified-owner' }));
    expect(JSON.stringify(record.mock.calls)).not.toContain(body.messages[0].content);
    record.mockClear();
    await controller.respond({ ...body, summary: '합성 요약' }, request, response as unknown as Response);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ firstTurn: false }));
  });
  it('records a first message on dispatch but counts a response only after successful completion', async () => {
    const journey = { id: 'a'.repeat(32), source: 'practicket' as const, entry: 'levi' as const, turnId: 'b'.repeat(32) };
    const ok = setup(jest.fn().mockResolvedValue({ reply: '합성 답변' }));
    await ok.controller.respond({ ...body, journey }, ok.request, ok.response as unknown as Response);
    expect(ok.journeyRecord).toHaveBeenCalledWith(journey, ['selected', 'first_message']);
    expect(ok.journeyRecord).toHaveBeenCalledWith(journey, ['selected', 'first_message', 'first_response'], journey.turnId);
    expect(JSON.stringify(ok.journeyRecord.mock.calls)).not.toContain(body.messages[0].content);
    const failed = setup(jest.fn().mockRejectedValue(new Error('synthetic failure')));
    await expect(failed.controller.respond({ ...body, journey }, failed.request, failed.response as unknown as Response)).rejects.toThrow();
    expect(failed.journeyRecord).toHaveBeenCalledTimes(1);
    expect(failed.journeyRecord).toHaveBeenCalledWith(journey, ['selected', 'first_message']);
  });
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
      'no-store, no-transform',
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
    response.emit('close');
    await expect(pending).resolves.toBeUndefined();
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('flushes SSE events in order, completes and releases the request', async () => {
    const respond = jest
      .fn()
      .mockImplementation((_body, _user, _signal, emit) => {
        emit({ type: 'delta', text: '먼저 도착' });
        emit({ type: 'reply', reply: '먼저 도착' });
        emit({ type: 'options', options: ['계속 이야기할게요'] });
        return Promise.resolve({ reply: '먼저 도착' });
      });
    const { controller, response, request, release } = setup(respond);
    request.headers = { accept: 'text/event-stream' };
    await controller.respond(body, request, response as unknown as Response);
    expect(response.flushHeaders).toHaveBeenCalledTimes(1);
    expect(response.write.mock.calls.map((call) => call[0])).toEqual([
      'data: {"type":"delta","text":"먼저 도착"}\n\n',
      'data: {"type":"reply","reply":"먼저 도착"}\n\n',
      'data: {"type":"options","options":["계속 이야기할게요"]}\n\n',
      'data: {"type":"done"}\n\n',
    ]);
    expect(response.end).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('sends only an allowlisted code on a streaming failure', async () => {
    const { controller, response, request } = setup(
      jest.fn().mockRejectedValue(new Error('private-prompt-marker')),
    );
    request.headers = { accept: 'text/event-stream' };
    await controller.respond(body, request, response as unknown as Response);
    expect(response.write).toHaveBeenCalledWith(
      'data: {"type":"error","code":"UNAVAILABLE"}\n\n',
    );
    expect(JSON.stringify(response.write.mock.calls)).not.toContain(
      'private-prompt-marker',
    );
  });
});
