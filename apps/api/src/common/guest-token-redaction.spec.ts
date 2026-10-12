import { redactGuestCapabilities } from './guest-token-redaction';
it('removes capability headers and response tokens without mutating the event', () => {
  const event = {
    request: { headers: { 'X-Guest-Token': 'secret', accept: 'json' } },
    data: [
      { guestAccessToken: 'secret', guest_access_hash: 'hash', status: 'ok' },
    ],
  };
  const redacted = redactGuestCapabilities(event);
  expect(JSON.stringify(redacted)).not.toContain('secret');
  expect(JSON.stringify(redacted)).not.toContain('hash');
  expect(redacted.request.headers).toEqual({ accept: 'json' });
  expect(event.request.headers['X-Guest-Token']).toBe('secret');
});
