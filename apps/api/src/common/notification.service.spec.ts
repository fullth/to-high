import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationService } from './notification.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('Signup email rendering', () => {
  const sendMail = jest.fn().mockResolvedValue({});
  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });
  const service = (enabled = true) =>
    new NotificationService({
      get: (key: string) =>
        enabled
          ? {
              GMAIL_USER: 'sender@example.test',
              GMAIL_APP_PASSWORD: 'dummy',
              ADMIN_EMAIL: 'operator@example.test',
            }[key]
          : undefined,
    } as ConfigService);
  it('renders profile markup as text and escapes image attributes', async () => {
    await service().notifyNewUser(
      {
        name: '<a href="https://evil.test">operator</a>',
        email: '<img src=x onerror=alert(1)>',
        picture: 'https://example.test/photo?q="&x=1',
      },
      2,
    );
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('operator@example.test');
    expect(mail.html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(mail.html).not.toContain('<a href=');
    expect(mail.html).toContain('&amp;x=1');
  });
  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml,<svg/>',
    'http://example.test/p',
    'https://user:pass@example.test/p',
    'not a url',
    'https://example.test/" onerror="alert(1)',
  ])('never creates an injected image attribute for %s', async (picture) => {
    await service().notifyNewUser({ email: 'user@example.test', picture }, 1);
    const html = sendMail.mock.calls[0][0].html;
    expect(html).not.toContain(' onerror=');
    if (!picture.startsWith('https://example.test/'))
      expect(html).not.toContain('<img');
  });
  it('keeps notifications disabled without SMTP credentials', async () => {
    await service(false).notifyNewUser({ email: 'user@example.test' }, 1);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
