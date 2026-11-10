import type { IncidentType } from './incident.service';

type IncidentMailInput = {
  kind: IncidentType;
  createdAt: Date;
  issueUrl?: string;
};

const details: Record<
  IncidentType,
  { title: string; impact: string; actions: string[] }
> = {
  api_failure: {
    title: '서비스 요청 처리 중 오류가 발생했어요',
    impact:
      '일부 서비스 요청이 처리되지 않았을 수 있어요. 영향 범위는 아직 확인되지 않았어요.',
    actions: [
      '서비스 접속과 주요 화면을 확인해 주세요.',
      'Railway의 API 상태와 최근 배포 내역을 확인해 주세요.',
    ],
  },
  chat_timeout: {
    title: '대화 응답 시간이 초과됐어요',
    impact:
      '일부 사용자가 답변을 받지 못했을 수 있어요. 전체 대화가 중단됐는지는 확인되지 않았어요.',
    actions: [
      '직접 짧은 대화를 시작해 응답 여부를 확인해 주세요.',
      '오류가 반복되면 API와 AI 제공자 상태를 확인해 주세요.',
    ],
  },
  chat_unavailable: {
    title: '대화 응답을 만들지 못했어요',
    impact:
      '일부 사용자가 답변을 받지 못했을 수 있어요. 원인과 영향 범위는 아직 확인되지 않았어요.',
    actions: [
      '직접 짧은 대화를 시작해 응답 여부를 확인해 주세요.',
      '관리자 화면의 예산과 Railway API 상태를 확인해 주세요.',
    ],
  },
  chat_summary_failure: {
    title: '긴 대화의 내용 정리에 실패했어요',
    impact:
      '긴 대화를 이어가던 일부 사용자의 요청이 처리되지 않았을 수 있어요.',
    actions: [
      'GitHub 이슈에서 발생 시간과 반복 여부를 확인해 주세요.',
      '오류가 반복되면 API와 AI 제공자 상태를 확인해 주세요.',
    ],
  },
};

const adminUrl = 'https://www.wirocare.com/admin/budget';
const railwayUrl =
  'https://railway.com/project/192d50f6-9752-4dcb-93f8-0d677bc5dd97/service/ab4609f2-1686-4d0d-8c6b-dc56073b7514';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
}

export function createIncidentMail({
  kind,
  createdAt,
  issueUrl,
}: IncidentMailInput) {
  const info = details[kind];
  const occurredAt = Number.isFinite(createdAt.getTime())
    ? `${new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(createdAt)} (한국 시간)`
    : '확인 필요';
  const safeIssueUrl =
    issueUrl &&
    /^https:\/\/github\.com\/fullth\/to-high\/issues\/\d+$/.test(issueUrl)
      ? issueUrl
      : undefined;
  const issueStatus = safeIssueUrl
    ? 'GitHub 이슈가 생성됐어요.'
    : 'GitHub 이슈 생성 여부를 확인해 주세요. 생성에 실패했다면 자동으로 다시 시도해요.';
  const subject = `[위로] 확인 필요: ${info.title}`;
  const text = [
    info.title,
    '',
    `처음 감지된 시각: ${occurredAt}`,
    `오류 유형: ${kind}`,
    '',
    `예상 영향: ${info.impact}`,
    '',
    '먼저 확인해 주세요',
    ...info.actions.map((action, index) => `${index + 1}. ${action}`),
    '',
    issueStatus,
    ...(safeIssueUrl ? [`GitHub 이슈: ${safeIssueUrl}`] : []),
    `관리자 화면: ${adminUrl}`,
    `Railway: ${railwayUrl}`,
    '',
    '같은 유형의 오류는 한 시간 단위로 묶어 알려드려요. 이 메일만으로 복구 여부와 영향을 받은 사용자 수는 알 수 없어요. 상담 내용과 사용자 정보는 포함하지 않아요.',
  ].join('\n');
  const actionItems = info.actions
    .map(
      (action, index) =>
        `<tr><td style="padding:0 10px 12px 0;vertical-align:top;color:#2e9b6d;font-weight:700;">${index + 1}</td><td style="padding:0 0 12px;color:#213128;font-size:14px;line-height:1.6;">${escapeHtml(action)}</td></tr>`,
    )
    .join('');
  const issueButton = safeIssueUrl
    ? `<a href="${escapeHtml(safeIssueUrl)}" style="display:inline-block;background:#2e9b6d;color:#ffffff;text-decoration:none;border-radius:12px;padding:13px 20px;font-size:14px;font-weight:700;">GitHub 이슈 확인하기</a>`
    : '';
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:#f5fbf7;color:#213128;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',Arial,sans-serif;"><div style="display:none;max-height:0;overflow:hidden;">오류가 감지됐어요. 영향과 먼저 확인할 사항을 살펴보세요.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5fbf7;"><tr><td align="center" style="padding:32px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;"><tr><td style="padding:0 4px 18px;color:#2e9b6d;font-size:16px;font-weight:800;">위로 <span style="color:#7b8c82;font-size:11px;font-weight:600;letter-spacing:1px;">TO HIGH</span></td></tr><tr><td style="background:#ffffff;border:1px solid #dfece3;border-radius:20px;padding:32px 26px;"><span style="display:inline-block;background:#e8f5ed;color:#207950;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;">운영 확인 필요</span><h1 style="margin:18px 0 10px;font-size:23px;line-height:1.4;letter-spacing:-0.4px;">${escapeHtml(info.title)}</h1><p style="margin:0;color:#64766b;font-size:14px;line-height:1.7;">${escapeHtml(info.impact)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#f3f8f4;border-radius:12px;"><tr><td style="padding:16px;color:#667a6e;font-size:13px;line-height:1.8;">처음 감지된 시각<br><strong style="color:#213128;font-size:14px;">${escapeHtml(occurredAt)}</strong><br>오류 유형 <strong style="color:#213128;">${escapeHtml(kind)}</strong></td></tr></table><h2 style="margin:0 0 14px;font-size:16px;">먼저 확인해 주세요</h2><table role="presentation" cellspacing="0" cellpadding="0">${actionItems}</table><p style="margin:10px 0 18px;color:#64766b;font-size:13px;line-height:1.6;">${escapeHtml(issueStatus)}</p>${issueButton}<p style="margin:22px 0 0;font-size:13px;line-height:1.8;"><a href="${adminUrl}" style="color:#27895f;">관리자 화면</a> &nbsp; / &nbsp; <a href="${railwayUrl}" style="color:#27895f;">Railway 확인</a></p></td></tr><tr><td style="padding:20px 5px;color:#75877c;font-size:12px;line-height:1.7;">같은 유형의 오류는 한 시간 단위로 묶어 알려드려요. 이 메일만으로 복구 여부와 영향을 받은 사용자 수는 알 수 없어요.<br>상담 내용과 사용자 정보는 포함하지 않아요.</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
