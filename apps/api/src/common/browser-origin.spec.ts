import type { Request, Response } from 'express';
import { browserOrigins, browserOriginBoundary } from './browser-origin';

describe('browser origin boundary before paid calls', () => {
  const allowed = 'https://www.example.invalid';
  function check(
    origin: string | undefined,
    type = 'application/json',
    path = '/ephemeral/respond',
  ) {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    browserOriginBoundary([allowed], true)(
      {
        headers: { origin },
        path,
        method: 'POST',
        is: (expected: string) => type === expected,
      } as unknown as Request,
      response as unknown as Response,
      next,
    );
    return { response, next };
  }
  it('does not allow development origins in production and fails closed on invalid configuration', () => {
    expect(browserOrigins(`${allowed}/`, true)).toEqual([allowed]);
    expect(() => browserOrigins(undefined, true)).toThrow();
    expect(() => browserOrigins('http://localhost:3001', true)).toThrow();
    expect(() => browserOrigins(`${allowed}/other`, true)).toThrow();
    expect(browserOrigins(undefined, false)).toContain('http://localhost:3001');
  });
  it.each([
    undefined,
    'null',
    'https://attacker.invalid',
    `${allowed}.attacker.invalid`,
    'http://localhost:3001',
  ])('blocks an untrusted origin before route handling: %s', (origin) => {
    const { response, next } = check(origin);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it('allows our JSON client but refuses simple request content types', () => {
    expect(check(allowed).next).toHaveBeenCalled();
    expect(check(allowed, 'text/plain').response.status).toHaveBeenCalledWith(
      415,
    );
  });
  it('uses the same case-insensitive path boundary as Express', () => {
    expect(
      check(undefined, 'application/json', '/EPHEMERAL/respond').response
        .status,
    ).toHaveBeenCalledWith(403);
    expect(
      check(undefined, 'application/json', '/ADMIN/BUDGET/topups').next,
    ).not.toHaveBeenCalled();
  });
  it('leaves OAuth callbacks and health checks without Origin available', () => {
    expect(
      check(undefined, '', '/auth/google/callback').next,
    ).toHaveBeenCalled();
  });
});
