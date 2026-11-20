const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.wirocare.com",
);
if (siteUrl.hostname === "wirocare.com") siteUrl.hostname = "www.wirocare.com";
export const SITE_URL = siteUrl.origin;

export const SERVICE_TITLE = "위로 | 마음을 털어놓는 AI 상담";

export const SERVICE_DESCRIPTION =
  "말하기 어려운 마음, AI 상담 캐릭터 레비에게 털어놓아 보세요. 가입 없이 선택지로 대화를 시작하고, 원할 때 로그인해 대화를 저장할 수 있어요.";
