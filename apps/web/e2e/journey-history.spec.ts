import { expect, test } from "@playwright/test";
import { isJourneyHistory, sumJourneys } from "../src/lib/journey-history";
const row = {
  day: "2026-11-23",
  source: "practicket" as const,
  entry: "lobby_ticketing" as const,
  landing: 3,
  selected: 2,
  character_selected: 1,
  first_message: 1,
  first_response: 1,
  continued: 0,
};
const history = {
  from: "2026-11-01",
  to: "2026-11-24",
  firstRecordedAt: "2026-11-23T01:00:00Z",
  days: [row],
};
test("journey parser rejects invalid dates, duplicate cohorts and impossible conversion counts", () => {
  expect(isJourneyHistory(history)).toBe(true);
  for (const days of [
    [row, row],
    [{ ...row, source: "private" }],
    [{ ...row, day: "2026-02-30" }],
    [{ ...row, first_response: 3 }],
    [{ ...row, continued: -1 }],
    [{ ...row, selected: "2" }],
  ])
    expect(isJourneyHistory({ ...history, days })).toBe(false);
  expect(sumJourneys([row, { ...row, source: "other" }])).toMatchObject({
    selected: 4,
    first_response: 2,
  });
});
