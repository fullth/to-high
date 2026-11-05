"use client";

import { useEffect, useRef } from "react";

const MEASUREMENT_ID = "G-KWL1FM3MFW";

export function HomeAnalytics() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current || window.location.pathname !== "/") return;
    // Avoid exposing arbitrary query strings or fragments to third-party code.
    if (window.location.search || window.location.hash) return;
    started.current = true;
    const target = window as Window & { dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void };
    target.dataLayer = target.dataLayer || [];
    target.gtag = function () {
      // Google tag consumes the arguments object used by its standard bootstrap.
      // eslint-disable-next-line prefer-rest-params
      target.dataLayer?.push(arguments);
    };
    const location = `${window.location.origin}/`;
    target.gtag("js", new Date());
    target.gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
      page_location: location,
      page_referrer: "",
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    target.gtag("event", "page_view", { page_location: location, page_referrer: "", page_title: "위로 홈" });
    const script = document.createElement("script");
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }, []);
  return null;
}
