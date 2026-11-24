import type { JourneyEntry, JourneySource } from "./journey";
export const funnelStages = [
  "landing",
  "selected",
  "character_selected",
  "first_message",
  "first_response",
  "continued",
] as const;
export type FunnelCounts = Record<(typeof funnelStages)[number], number>;
export type JourneyHistory = {
  from: string;
  to: string;
  firstRecordedAt: string | null;
  days: (FunnelCounts & {
    day: string;
    source: JourneySource;
    entry: JourneyEntry;
  })[];
};
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const day = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export function isJourneyHistory(value: unknown): value is JourneyHistory {
  if (
    !object(value) ||
    !day(value.from) ||
    !day(value.to) ||
    value.from > value.to ||
    !(
      value.firstRecordedAt === null ||
      (typeof value.firstRecordedAt === "string" &&
        Number.isFinite(Date.parse(value.firstRecordedAt)))
    ) ||
    !Array.isArray(value.days) ||
    value.days.length > 240
  )
    return false;
  const seen = new Set<string>();
  return value.days.every((row) => {
    if (
      !object(row) ||
      !day(row.day) ||
      row.day < String(value.from) ||
      row.day > String(value.to) ||
      !["practicket", "other"].includes(String(row.source)) ||
      !["unselected", "ad_ticketing", "lobby_ticketing", "levi"].includes(
        String(row.entry),
      ) ||
      !funnelStages.every(
        (key) =>
          typeof row[key] === "number" &&
          Number.isSafeInteger(row[key]) &&
          row[key] >= 0,
      )
    )
      return false;
    const key = `${row.day}:${row.source}:${row.entry}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return (
      Number(row.continued) <= Number(row.first_response) &&
      Number(row.first_response) <= Number(row.first_message) &&
      Number(row.first_message) <= Number(row.selected) &&
      Number(row.character_selected) <= Number(row.selected)
    );
  });
}
export function sumJourneys(rows: JourneyHistory["days"]): FunnelCounts {
  return Object.fromEntries(
    funnelStages.map((key) => [
      key,
      rows.reduce((sum, row) => sum + row[key], 0),
    ]),
  ) as FunnelCounts;
}
