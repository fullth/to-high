import { expect, test } from "@playwright/test";
import type { JourneyContext } from "../src/lib/journey";
import path from "node:path";

type Event = { journey: JourneyContext; event: string };
for (const flow of [
  { ad: true, explicit: false, entry: "ad_ticketing", source: "practicket" },
  { ad: true, explicit: true, entry: "lobby_ticketing", source: "practicket" },
  { ad: false, explicit: true, entry: "lobby_ticketing", source: "other" },
] as const) {
  test(`${flow.source} acquisition with ${flow.entry} preserves one anonymous flow`, async ({
    page,
  }) => {
    const events: Event[] = [];
    const calls: {
      journey: JourneyContext & { turnId: string };
      scenario: { source: string };
    }[] = [];
    await page.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (
        url.origin === "http://127.0.0.1:3103" ||
        url.hostname === "cdn.jsdelivr.net"
      )
        return route.continue();
      if (url.origin !== "http://127.0.0.1:3999") return route.abort();
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization,content-type,x-browser-id",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      };
      if (request.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      if (url.pathname === "/journey/events") {
        events.push(request.postDataJSON());
        return route.fulfill({ status: 204, headers });
      }
      if (url.pathname === "/ephemeral/start-options")
        return route.fulfill({
          headers,
          json: { options: ["합성 선택지로 이야기할게", "아쉬운 마음이 있어", "무대가 궁금해", "잠깐 쉬고 싶어"] },
        });
      if (url.pathname === "/ephemeral/respond") {
        calls.push(request.postDataJSON());
        return route.fulfill({
          headers,
          json: { reply: "합성 응답입니다.", options: ["조금 더 이야기할게"] },
        });
      }
      return route.fulfill({ status: 401, headers, json: {} });
    });
    await page.goto(
      flow.ad
        ? "/?utm_source=practicket&utm_medium=banner&utm_campaign=private-marker"
        : "/",
    );
    await expect
      .poll(() => events.filter((e) => e.event === "landing").length)
      .toBe(1);
    if (flow.explicit)
      await page.getByRole("link", { name: /시나리오 모드/ }).click();
    else
      await page
        .getByRole("link", { name: "레비와 대화 시작하기" })
        .first()
        .click();
    await page.getByRole("button", { name: /남자 캐릭터/ }).click();
    await page.getByLabel("캐릭터 이름", { exact: true }).fill("합성캐릭터");
    await page.getByRole("button", { name: "이 이름으로 이야기 시작" }).click();
    await expect
      .poll(() => events.some((e) => e.event === "character_selected"))
      .toBe(true);
    await page
      .getByRole("button", { name: "합성 선택지로 이야기할게", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "조금 더 이야기할게", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "조금 더 이야기할게", exact: true })
      .click();
    await expect.poll(() => calls.length).toBe(2);
    expect(calls[0].journey).toMatchObject({
      id: events[0].journey.id,
      entry: flow.entry,
      source: flow.source,
    });
    expect(calls[0].scenario.source).toBe(
      flow.explicit ? "lobby" : "practicket",
    );
    expect(calls[1].journey.id).toBe(calls[0].journey.id);
    expect(calls[1].journey.turnId).not.toBe(calls[0].journey.turnId);
    expect(JSON.stringify(events)).not.toMatch(
      /合成|합성캐릭터|private-marker|messages|name|utm_/,
    );
    expect(events.some((e) => e.event === "first_response")).toBe(false);
    expect(
      await page.evaluate(() => sessionStorage.getItem("wiroPendingJourneyV1")),
    ).toBeNull();
    const old = calls[0].journey.id;
    await page.reload();
    await expect
      .poll(
        () =>
          events.filter((e) => e.event === "selected" && e.journey.id !== old)
            .length,
      )
      .toBeGreaterThan(0);
  });
}

test("admin separates cohorts, excludes today and displays mobile details", async ({
  page,
  browserName,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("accessToken", "synthetic-admin"),
  );
  const counts = {
    landing: 4,
    selected: 3,
    character_selected: 2,
    first_message: 2,
    first_response: 1,
    continued: 1,
  };
  await page.route("http://127.0.0.1:3999/**", (route) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (route.request().url().endsWith("/auth/me"))
      return route.fulfill({
        headers,
        json: { userId: "synthetic-admin", email: "test@example.invalid" },
      });
    return route.fulfill({
      headers,
      json: {
        balanceMilliWon: 10000000,
        reservedMilliWon: 0,
        accounting: {
          startedAt: "2026-11-12T00:00:00Z",
          carryoverMilliWon: 10000000,
          approvedMilliWon: 0,
          settledMilliWon: 0,
        },
        notificationReady: true,
        credits: [],
        journeyHistory: {
          from: "2026-10-26",
          to: "2026-11-24",
          firstRecordedAt: "2026-11-20T01:00:00Z",
          days: [
            {
              day: "2026-11-23",
              source: "practicket",
              entry: "ad_ticketing",
              ...counts,
            },
            {
              day: "2026-11-23",
              source: "practicket",
              entry: "lobby_ticketing",
              ...counts,
              selected: 8,
            },
            {
              day: "2026-11-23",
              source: "other",
              entry: "lobby_ticketing",
              ...counts,
              selected: 5,
            },
            {
              day: "2026-11-24",
              source: "other",
              entry: "lobby_ticketing",
              ...counts,
              selected: 99,
            },
          ],
        },
      },
    });
  });
  await page.goto("/admin/budget");
  const panel = page.getByRole("region", { name: "유입 경로별 대화 전환" });
  await expect(
    panel.getByText("오늘 집계 중: 진입 99", { exact: false }),
  ).toBeVisible();
  await expect(
    panel.getByRole("row").filter({ hasText: "로비에서 선택한 시나리오" }),
  ).toContainText("13");
  await panel.getByRole("radio", { name: "프랙티켓", exact: true }).click();
  await expect(
    panel.getByRole("row").filter({ hasText: "로비에서 선택한 시나리오" }),
  ).toContainText("8");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: path.resolve(
        __dirname,
        `../../../scripts/local-test/.runtime/journey-${browserName}-${width}.png`,
      ),
      fullPage: true,
    });
  }
  const row = panel
    .getByRole("row")
    .filter({ hasText: "로비에서 선택한 시나리오" });
  await row.locator("summary").click();
  await expect(row.getByText("응답 3회 이상", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
