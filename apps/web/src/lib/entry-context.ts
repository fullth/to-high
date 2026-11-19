export type EntryContext = "ticketing";

type Query = Pick<URLSearchParams, "getAll">;

/** Only known topic codes cross the home/chat boundary. */
export function resolveEntryContext(
  query: Query,
  referrer = "",
): EntryContext | undefined {
  const explicit = query.getAll("entry");
  if (explicit.length)
    return explicit.length === 1 && explicit[0] === "ticketing"
      ? "ticketing"
      : undefined;
  const source = query.getAll("utm_source");
  const medium = query.getAll("utm_medium");
  if (source.length || medium.length) {
    return source.length === 1 &&
      source[0] === "practicket" &&
      medium.length === 1 &&
      medium[0] === "banner"
      ? "ticketing"
      : undefined;
  }
  try {
    const url = new URL(referrer);
    if (
      url.protocol === "https:" &&
      ["practicket.com", "www.practicket.com"].includes(url.hostname)
    )
      return "ticketing";
  } catch {
    /* Missing referrer is normal for direct visits. */
  }
  return undefined;
}

export function talkEntryHref(context?: EntryContext) {
  return context === "ticketing" ? "/talk?entry=ticketing" : "/talk";
}

export const DEFAULT_ENTRY = {
  greeting: "어디서부터 말해야 할지 몰라도 괜찮아요. 선택지만 눌러도 괜찮아요.",
};
export const OTHER_TOPIC = "다른 이야기로 시작할게요";
export const TICKETING_ENTRY = {
  greeting: "티켓팅을 놓쳐서 속상하셨나요? 아쉬운 마음, 제가 들어드릴게요.",
};
