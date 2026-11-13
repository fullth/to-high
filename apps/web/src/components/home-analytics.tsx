"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";

const MEASUREMENT_ID = "G-KWL1FM3MFW";
const AD_CAMPAIGN = {
  utm_source: "practicket",
  utm_medium: "banner",
  utm_campaign: "위로",
};

function measuredHomeLocation(): string | null {
  const { origin, pathname, search, hash } = window.location;
  if (pathname !== "/" || hash) return null;
  if (!search) return `${origin}/`;

  const params = new URLSearchParams(search);
  const campaign = params.get("utm_campaign");
  if (
    [...params].length !== 3 ||
    params.get("utm_source") !== AD_CAMPAIGN.utm_source ||
    params.get("utm_medium") !== AD_CAMPAIGN.utm_medium ||
    !campaign
  ) return null;

  const measuredUrl = new URL("/", origin);
  // Advertiser-set campaign names can contain personal information; send only approved values.
  for (const [key, value] of Object.entries(AD_CAMPAIGN)) measuredUrl.searchParams.set(key, value);
  return measuredUrl.toString();
}

export function trackTalkStart(event: MouseEvent<HTMLAnchorElement>) {
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (!gtag) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    gtag("event", "talk_start_click");
    return;
  }

  event.preventDefault();
  let navigated = false;
  const navigate = () => {
    if (navigated) return;
    navigated = true;
    // Counseling uses a fresh document so home-only third-party scripts do not remain active.
    window.location.assign(new URL("/talk", window.location.origin).toString());
  };
  window.setTimeout(navigate, 800);
  gtag("event", "talk_start_click", {
    event_callback: navigate,
    event_timeout: 800,
  });
}

export function HomeAnalytics() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    // Only the approved ad campaign may expose query values to analytics.
    const location = measuredHomeLocation();
    if (!location) return;
    started.current = true;
    const target = window as Window & { dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void };
    target.dataLayer = target.dataLayer || [];
    target.gtag = function () {
      // Google tag consumes the arguments object used by its standard bootstrap.
      // eslint-disable-next-line prefer-rest-params
      target.dataLayer?.push(arguments);
    };
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
