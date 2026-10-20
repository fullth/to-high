"use client";

import { useEffect } from "react";

// 후원 링크·수취인은 show-me-the-coffee 예제(fin-term)와 동일하게 맞춘다.
const KAKAO_PAY_URL = "https://qr.kakaopay.com/Ej84nMWnw";
const RECIPIENT_NAME = "임태환";
const SITE_KEY = "fin-term";

// 랜딩의 세이지 배경과 진한 초록 글자로 후원 위젯의 톤을 맞춘다.
const ACCENT_COLOR = "#e4f2e9";
const TEXT_COLOR = "#245b42";

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

  // 위젯의 Shadow DOM 안에서 런처에만 유리 질감을 적용한다.
  if (!host.shadowRoot?.querySelector("#levi-coffee-glass")) {
    const style = document.createElement("style");
    style.id = "levi-coffee-glass";
    style.textContent = `
      .fab {
        background: linear-gradient(160deg, rgba(255,255,255,.94), rgba(233,247,239,.78));
        color: #245b42;
        border: 1px solid rgba(255,255,255,.95);
        -webkit-backdrop-filter: blur(16px) saturate(140%);
        backdrop-filter: blur(16px) saturate(140%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.98),
          0 6px 20px rgba(35,82,58,.18), 0 0 0 1px rgba(77,125,97,.12);
      }
      .fab:hover {
        box-shadow: inset 0 1px 0 rgba(255,255,255,1),
          0 9px 24px rgba(35,82,58,.22), 0 0 0 1px rgba(77,125,97,.18);
      }
    `;
    host.shadowRoot?.appendChild(style);
  }

  const fabHeight = fab.getBoundingClientRect().height;
  if (fabHeight === 0) return false;

  const channelLauncher = document.getElementById("support-channel-launcher");
  if (!channelLauncher) return false;
  const launcher = channelLauncher.getBoundingClientRect();
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const offsetX = window.innerWidth - launcher.left + (mobile ? 12 : 16);
  const centerAdjustment = (launcher.height - fabHeight) / 2;
  host.style.setProperty("--smtc-offset-x", `${offsetX}px`);
  host.style.setProperty(
    "--smtc-offset-y",
    mobile
      ? `calc(20px + env(safe-area-inset-bottom, 0px) + ${centerAdjustment}px)`
      : `${window.innerHeight - launcher.bottom + centerAdjustment}px`,
  );
  return true;
}

export function CoffeeSupport() {
  useEffect(() => {
    loadCoffeeWidget();

    const syncPosition = () => {
      alignToChannelTalk();
    };
    const observer = new ResizeObserver(syncPosition);
    // 비동기 위젯이 생성되면 버튼 크기 변경도 감지한다.
    let observed = false;

    // 위젯 mount 가 비동기라 정렬될 때까지 짧게 폴링한다.
    let tries = 0;
    const timer = window.setInterval(() => {
      const aligned = alignToChannelTalk();
      const fab = document.getElementById("smtc-root")?.shadowRoot?.querySelector(".fab");
      if (fab && !observed) {
        observer.observe(fab);
        observed = true;
      }
      if (aligned || ++tries > 40) {
        window.clearInterval(timer);
      }
    }, 250);

    window.addEventListener("resize", syncPosition);
    window.visualViewport?.addEventListener("resize", syncPosition);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      window.removeEventListener("resize", syncPosition);
      window.visualViewport?.removeEventListener("resize", syncPosition);
    };
  }, []);

  return null;
}
