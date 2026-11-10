import { createIncidentMail } from './incident-mail';
import { INCIDENT_TYPES } from './incident.service';

describe('incident email', () => {
  it.each(INCIDENT_TYPES)(
    'explains the impact and next steps for %s',
    (kind) => {
      const mail = createIncidentMail({
        kind,
        createdAt: new Date('2026-11-10T00:30:00Z'),
        issueUrl: 'https://github.com/fullth/to-high/issues/123',
      });
      expect(mail.subject).toContain('확인 필요');
      expect(mail.text).toContain('09:30');
      expect(mail.text).toContain('영향');
      expect(mail.text).toContain('먼저 확인');
      expect(mail.html).toContain(
        'https://github.com/fullth/to-high/issues/123',
      );
      expect(mail.html).toContain('상담 내용과 사용자 정보는 포함하지 않아요');
    },
  );

  it('does not insert an untrusted issue address', () => {
    const mail = createIncidentMail({
      kind: 'api_failure',
      createdAt: new Date(0),
      issueUrl: 'https://example.test/<script>alert(1)</script>',
    });
    expect(mail.html).not.toContain('example.test');
    expect(mail.text).not.toContain('example.test');
    expect(mail.text).toContain('자동으로 다시 시도');
  });
});
