import { HttpException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { PrivacyExceptionFilter } from './privacy-exception.filter';

describe('privacy exception boundary', () => {
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
      switchToHttp: () => ({ getResponse: () => response }),
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
