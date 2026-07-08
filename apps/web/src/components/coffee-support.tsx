"use client";

import { useEffect } from "react";

// 후원 링크·수취인은 show-me-the-coffee 예제(fin-term)와 동일하게 맞춘다.
const KAKAO_PAY_URL = "https://qr.kakaopay.com/Ej84nMWnw";
const RECIPIENT_NAME = "임태환";
const SITE_KEY = "fin-term";

// 채널톡 런처와 톤을 맞춘 색(크림 배경 + 브라운 글자).
const ACCENT_COLOR = "#f0dec1";
const TEXT_COLOR = "#7b511d";

// 채널톡 데스크톱 런처 배치값. 런처는 iframe 안에 그려져 부모 페이지에서
// 실측이 불가하므로 렌더 결과를 캡처해 측정한 지오메트리(우 24 / 하 25 / 지름 55)에 맞춘다.
const CH_LAUNCHER_RIGHT = 24;
const CH_LAUNCHER_BOTTOM = 25;
const CH_LAUNCHER_SIZE = 55;
// 채널톡 런처와 후원 버튼 사이 좌우 간격(px).
const GAP = 16;

type SmtcFn = (command: "boot", options: Record<string, unknown>) => void;

type SmtcWindow = Window & {
  SMTC?: SmtcFn;
  __smtcBooted?: boolean;
};

// SMTC 로더(CDN)를 1회 주입하고 boot 한다. mount 는 멱등하지만
// 스크립트 중복 삽입은 막아야 하므로 전역 플래그로 가드한다.
function loadCoffeeWidget() {
  const w = window as SmtcWindow;
  if (w.__smtcBooted) return;
  w.__smtcBooted = true;

  const boot = () => {
    w.SMTC?.("boot", {
      kakaoPayUrl: KAKAO_PAY_URL,
      name: RECIPIENT_NAME,
      siteKey: SITE_KEY,
      analytics: true,
      label: "커피 후원",
      accentColor: ACCENT_COLOR,
      textColor: TEXT_COLOR,
      position: "br",
    });
  };

  if (w.SMTC) {
    boot();
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src =
    "https://cdn.jsdelivr.net/npm/show-me-the-coffee/dist/show-me-the-coffee.js";
  script.onload = boot;
  document.head.appendChild(script);
}

// 후원 버튼을 채널톡 런처 왼쪽에, 런처와 세로 중심을 맞춰 배치한다.
// 런처와 후원 버튼 높이가 달라 상단 정렬은 중심이 어긋나므로 중심선을 맞춘다.
function alignToChannelTalk() {
  const host = document.getElementById("smtc-root");
  const fab = host?.shadowRoot?.querySelector<HTMLElement>(".fab");
  if (!host || !fab) return false;

  const fabHeight = fab.getBoundingClientRect().height;
  if (fabHeight === 0) return false;

  // 런처 왼쪽 = 화면 우측에서 (런처 오른쪽 여백 + 지름) 만큼 들어온 지점.
  // 그 왼쪽에 간격을 두고 후원 버튼(우측 기준 offsetX)을 붙인다.
  const offsetX = CH_LAUNCHER_RIGHT + CH_LAUNCHER_SIZE + GAP;
  // 런처 세로 중심(하단 기준)에 후원 버튼 중심을 맞춘다.
  const launcherCenterFromBottom = CH_LAUNCHER_BOTTOM + CH_LAUNCHER_SIZE / 2;
  const offsetY = launcherCenterFromBottom - fabHeight / 2;

  host.style.setProperty("--smtc-offset-x", `${offsetX}px`);
  host.style.setProperty("--smtc-offset-y", `${Math.max(offsetY, 0)}px`);
  return true;
}

export function CoffeeSupport() {
  useEffect(() => {
    loadCoffeeWidget();

    // 위젯 mount 가 비동기라 정렬될 때까지 짧게 폴링한다.
    let tries = 0;
    const timer = window.setInterval(() => {
      if (alignToChannelTalk() || ++tries > 40) {
        window.clearInterval(timer);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
