import type { MouseEvent } from "react";

export type JourneySource = "practicket" | "other";
export type JourneyEntry =
  | "unselected"
  | "ad_ticketing"
  | "lobby_ticketing"
  | "levi";
export type JourneyContext = {
  id: string;
  source: JourneySource;
  entry: JourneyEntry;
};
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const pendingKey = "wiroPendingJourneyV1";
const lifetime = 30 * 60_000;
let home: JourneyContext | undefined;
let homeExpiresAt = 0;
let acquiredSource: JourneySource | undefined;
const newId = () => crypto.randomUUID().replaceAll("-", "");

function source(): JourneySource {
  if (acquiredSource) return acquiredSource;
  const query = new URLSearchParams(window.location.search);
  if (
    query.getAll("utm_source").length === 1 &&
    query.get("utm_source") === "practicket" &&
    query.getAll("utm_medium").length === 1 &&
    query.get("utm_medium") === "banner"
  )
    return "practicket";
  try {
    const url = new URL(document.referrer);
    if (
      url.protocol === "https:" &&
      ["practicket.com", "www.practicket.com"].includes(url.hostname)
    )
      return "practicket";
  } catch {
    /* Direct visits normally have no referrer. */
  }
  return "other";
}
export function recordJourney(
  journey: JourneyContext,
  event: "landing" | "selected" | "character_selected",
) {
  // Only fixed enums and a temporary random ID cross this boundary.
  void fetch(`${API_URL}/journey/events`, {
    method: "POST",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ journey, event }),
  }).catch(() => {});
}
export function forgetHomeJourney() {
  home = undefined;
}
export function trackHomeJourney() {
  if (home && Date.now() < homeExpiresAt) return home;
  home = { id: newId(), source: source(), entry: "unselected" };
  homeExpiresAt = Date.now() + lifetime;
  recordJourney(home, "landing");
  return home;
}
export function prepareTalkJourney(
  event: MouseEvent<HTMLAnchorElement>,
  explicitScenario = false,
) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const visit = trackHomeJourney();
  const href = new URL(event.currentTarget.href, window.location.origin);
  const entry: JourneyEntry = explicitScenario
    ? "lobby_ticketing"
    : href.searchParams.get("entry") === "ticketing"
      ? "ad_ticketing"
      : "levi";
  const journey = { ...visit, entry };
  recordJourney(journey, "selected");
  try {
    sessionStorage.setItem(
      pendingKey,
      JSON.stringify({ journey, expiresAt: Date.now() + lifetime }),
    );
  } catch {
    /* Storage restrictions must not block counseling. */
  }
}
export function beginTalkJourney(
  entry: Exclude<JourneyEntry, "unselected">,
): JourneyContext {
  let journey: JourneyContext | undefined;
  try {
    const raw = sessionStorage.getItem(pendingKey);
    sessionStorage.removeItem(pendingKey);
    if (raw) {
      const pending = JSON.parse(raw);
      const candidate = pending?.journey;
      if (
        candidate &&
        typeof candidate.id === "string" &&
        typeof pending.expiresAt === "number" &&
        /^[a-f0-9]{32}$/.test(candidate.id) &&
        ["practicket", "other"].includes(candidate.source) &&
        candidate.entry === entry &&
        pending.expiresAt > Date.now() &&
        pending.expiresAt <= Date.now() + lifetime
      ) {
        journey = { id: candidate.id, source: candidate.source, entry };
      }
    }
  } catch {
    /* Missing or invalid anonymous navigation state is ignored. */
  }
  journey ??= { id: newId(), source: source(), entry };
  acquiredSource = journey.source;
  recordJourney(journey, "selected");
  return journey;
}
