import { HttpException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { PrivacyExceptionFilter } from './privacy-exception.filter';

describe('privacy exception boundary', () => {
  it('records guard rejection once with a fixed code and no request contents', () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const request = { path: '/EPHEMERAL/respond/', method: 'POST', body: { messages: ['private-marker'] }, chatMetricsRecorded: false };
    const response = { headersSent: false, status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }) } as unknown as ArgumentsHost;
    const filter = new PrivacyExceptionFilter(undefined, undefined, { record } as never);
    filter.catch(new HttpException('private-error', 429), host);
    filter.catch(new HttpException('private-error', 429), host);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith({ outcome: 'RATE_LIMITED', rejected: true });
    expect(JSON.stringify(record.mock.calls)).not.toContain('private');
  });
  it('reports server errors without exposing the original exception', () => {
    const report = jest.fn().mockResolvedValue(undefined);
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ path: '/saved-sessions', method: 'GET' }),
      }),
    } as unknown as ArgumentsHost;
    new PrivacyExceptionFilter(undefined, { report } as never).catch(
      new Error('private content'),
      host,
    );
    expect(report).toHaveBeenCalledWith('api_failure');
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      'private content',
    );
  });
  it.each([
    new Error('private-counseling-marker'),
    new HttpException({ message: 'private-counseling-marker' }, 400),
  ])('never emits arbitrary error messages', (error) => {
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ path: '/ephemeral/respond' }),
      }),
    } as unknown as ArgumentsHost;
    const logs = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    new PrivacyExceptionFilter().catch(error, host);
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      'private-counseling-marker',
    );
    expect(logs).not.toHaveBeenCalled();
    logs.mockRestore();
  });
});
