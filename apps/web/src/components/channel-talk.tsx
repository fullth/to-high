"use client";

import { useEffect } from "react";

const PLUGIN_KEY =
  process.env.NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY ||
  "a9348dfa-85d6-4a0b-891f-bfee79de9a3c";

type ChannelIOFn = ((...args: unknown[]) => void) & {
  q?: unknown[][];
  c?: (args: unknown[]) => void;
};

type ChannelWindow = Window & {
  ChannelIO?: ChannelIOFn;
  ChannelIOInitialized?: boolean;
};

// 채널톡 부트 스니펫(공식 로더)을 1회 주입하고 boot 한다.
// SDK 로더는 멱등하지 않으므로 전역 플래그로 중복 boot를 막는다.
function loadChannelTalk() {
  const w = window as ChannelWindow;
  if (w.ChannelIOInitialized) return;
  w.ChannelIOInitialized = true;

  const ch: ChannelIOFn = function (...args: unknown[]) {
    ch.c?.(args);
  };
  ch.q = [];
  ch.c = (args) => {
    ch.q?.push(args);
  };
  w.ChannelIO = ch;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://cdn.channel.io/plugin/ch-plugin-web.js";
  document.head.appendChild(script);

  ch("boot", { pluginKey: PLUGIN_KEY });
}

export function ChannelTalk() {
  useEffect(() => {
    loadChannelTalk();
  }, []);

  return null;
}

// 상담 화면 등 채널톡 버튼을 감추고 싶은 곳에서 사용.
export function useHideChannelTalk() {
  useEffect(() => {
    const w = window as ChannelWindow;
    w.ChannelIO?.("hideChannelButton");
    return () => {
      w.ChannelIO?.("showChannelButton");
    };
  }, []);
}
