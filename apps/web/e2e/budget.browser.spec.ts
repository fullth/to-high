import { expect, test } from "@playwright/test";

for (const provider of ["Google"] as const) {
  test(`${provider} login returns to the budget page`, async ({ page }) => {
    await page.route("http://127.0.0.1:3999/**", async (route) => {
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization,content-type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      };
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      const url = new URL(route.request().url());
      if (url.pathname === `/auth/${provider.toLowerCase()}`)
        return route.fulfill({
          contentType: "text/html",
          body: `<script>location.replace(${JSON.stringify(`http://127.0.0.1:3103/auth/callback#token=mock-token&state=${url.searchParams.get("state")}`)})</script>`,
        });
      if (route.request().url().endsWith("/auth/me"))
        return route.fulfill({
          headers,
          json: { userId: "admin", email: "admin@example.invalid" },
        });
      if (route.request().url().endsWith("/admin/budget"))
        return route.fulfill({
          headers,
          json: {
            balanceMilliWon: 10000000,
            reservedMilliWon: 1000,
            accounting: {
              startedAt: "2026-11-12T00:00:00.000Z",
              carryoverMilliWon: 10000000,
              approvedMilliWon: 0,
              settledMilliWon: 0,
            },
            notificationReady: true,
            credits: [],
          },
        });
      return route.fulfill({ status: 404, headers });
    });
    await page.goto("/admin/budget");
    await page.getByRole("button", { name: `${provider} 로그인` }).click();
    await expect(page).toHaveURL(/\/admin\/budget$/);
    await expect(
      page
        .getByLabel("AI 운영 예산")
        .getByText("총 운영 한도:", { exact: true })
        .locator(".."),
    ).toContainText("10,000원");
    await expect(
      page
        .getByText("처리 중 / 확인 필요 금액:", { exact: true })
        .locator(".."),
    ).toContainText("1원");
    expect(
      await page.evaluate(() => sessionStorage.getItem("authReturnTo")),
    ).toBeNull();
  });
}

test("a lost topup response is retried with the same operation id after reload", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("accessToken", "mock-token"),
  );
  const requests: { amountWon: number; operationId: string }[] = [];
  await page.route("http://127.0.0.1:3999/**", async (route) => {
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
        json: { userId: "admin", email: "admin@example.invalid" },
      });
    if (route.request().url().endsWith("/admin/budget/topups")) {
      requests.push(route.request().postDataJSON());
      return requests.length === 1
        ? route.fulfill({ status: 503, headers, json: {} })
        : route.fulfill({ headers, json: { balanceMilliWon: 10000000 } });
    }
    if (route.request().url().endsWith("/admin/budget"))
      return route.fulfill({
        headers,
        json: {
          balanceMilliWon: 10000000,
          reservedMilliWon: 0,
          accounting: {
            startedAt: "2026-11-12T00:00:00.000Z",
            carryoverMilliWon: 10000000,
            approvedMilliWon: 0,
            settledMilliWon: 0,
          },
          notificationReady: true,
          credits: [],
        },
      });
    return route.fulfill({ status: 404, headers });
  });
  await page.goto("/admin/budget");
  await page.getByRole("button", { name: "한도 10,000원 추가 승인" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "승인 결과를 확인하지 못했어요" }),
  ).toContainText("승인 결과를 확인하지 못했어요");
  await page.reload();
  await page.getByRole("button", { name: "같은 승인 요청 다시 확인" }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0].amountWon).toBe(10000);
  await expect(
    page.getByRole("button", { name: "한도 10,000원 추가 승인" }),
  ).toBeVisible();
});

test("daily usage exposes success, errors and tokens without mobile overflow", async ({
  page,
  browserName,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("accessToken", "mock-token"),
  );
  await page.route("http://127.0.0.1:3999/**", async (route) => {
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
        json: { userId: "admin", email: "admin@example.invalid" },
      });
    return route.fulfill({
      headers,
      json: {
        balanceMilliWon: 9000000,
        reservedMilliWon: 2725,
        todayUsage: { countedTurns: 4, signedInAccounts: 1, guestNetworks: 1 },
        accounting: {
          startedAt: "2026-11-16T00:00:00Z",
          carryoverMilliWon: 10000000,
          approvedMilliWon: 0,
          settledMilliWon: 1000000,
        },
        notificationReady: true,
        credits: [],
        usageHistory: {
          from: "2026-10-18",
          to: "2026-11-16",
          firstRecordedAt: "2026-11-16T00:00:00Z",
          days: [
            {
              day: "2026-11-16",
              requests: {
                day: "2026-11-16",
                requests: 4,
                successes: 2,
                starts: 1,
                failures: 1,
                cancelled: 1,
                rejected: 0,
                signedInAccounts: 1,
                guestNetworks: 1,
                outcomes: { ok: 2, TIMEOUT: 1, cancelled: 1 },
              },
              model: {
                settledMilliWon: 53270,
                reportedCalls: 4,
                inputTokens: 1000,
                cachedInputTokens: 500,
                outputTokens: 100,
              },
            },
            { day: "2026-11-15", requests: null, model: null },
          ],
        },
      },
    });
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/admin/budget");
  const history = page.getByRole("region", { name: "일별 이용 추이" });
  await expect(
    history
      .getByRole("button", { name: "2026-11-16 상세 보기" })
      .locator("../.."),
  ).toContainText("53.27원");
  await expect(
    history
      .getByRole("button", { name: "2026-11-15 상세 보기" })
      .locator("../.."),
  ).toContainText("—");
  await history.getByRole("radio", { name: "30일", exact: true }).click();
  await history.getByRole("button", { name: "2026-11-16 상세 보기" }).click();
  await expect(
    history
      .locator("#usage-day-2026-11-16")
      .getByText("캐시 입력 토큰", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: `../../scripts/local-test/.runtime/usage-history-${browserName}-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    history
      .getByRole("button", { name: "2026-11-16 상세 보기" })
      .locator("../.."),
  ).toContainText("53.27원");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1440);
  await page.screenshot({
    path: `../../scripts/local-test/.runtime/usage-history-${browserName}-desktop.png`,
    fullPage: true,
  });
});

test("design system supports populated trends, keyboard focus and empty states", async ({
  page,
  browserName,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("accessToken", "mock-token"),
  );
  const requests = [14, 21, 27, 33, 18, 30, 42];
  const days = requests
    .map((count, index) => ({
      day: `2026-11-${10 + index}`,
      requests: {
        day: `2026-11-${10 + index}`,
        requests: count,
        successes: count - 4,
        starts: 4,
        failures: 2,
        cancelled: 1,
        rejected: 1,
        signedInAccounts: 3,
        guestNetworks: 2,
        outcomes: { ok: count - 4, TIMEOUT: 2, cancelled: 1, RATE_LIMITED: 1 },
      },
      model: {
        settledMilliWon: count * 1300,
        reportedCalls: (count - 4) * 2,
        inputTokens: count * 1000,
        cachedInputTokens: count * 500,
        outputTokens: count * 100,
      },
    }))
    .reverse();
  let empty = false;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
  await page.route("http://127.0.0.1:3999/**", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (route.request().url().endsWith("/auth/me"))
      return route.fulfill({
        headers,
        json: { userId: "admin", email: "admin@example.invalid" },
      });
    return route.fulfill({
      headers,
      json: {
        balanceMilliWon: 9756775,
        reservedMilliWon: 2725,
        todayUsage: { countedTurns: 42, signedInAccounts: 3, guestNetworks: 2 },
        accounting: {
          startedAt: "2026-11-10T00:00:00Z",
          carryoverMilliWon: 10000000,
          approvedMilliWon: 0,
          settledMilliWon: 240500,
        },
        notificationReady: false,
        credits: [
          {
            at: "2026-11-10T00:00:00Z",
            amountMilliWon: 10000000,
            actor: "synthetic-admin",
            kind: "manual",
          },
        ],
        usageHistory: {
          from: "2026-10-18",
          to: "2026-11-16",
          firstRecordedAt: "2026-11-10T00:00:00Z",
          days: empty ? [] : days,
        },
      },
    });
  });
  await page.goto("/admin/budget");
  await expect(
    page.getByRole("img", { name: /일별 상담 요청과 성공 수/ }),
  ).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(async () => {
      await document.fonts.load('700 32px "Pretendard Variable"');
      await document.fonts.ready;
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      page.getByRole("button", { name: "한도 10,000원 추가 승인" }),
    ).toBeVisible();
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `../../scripts/local-test/.runtime/design-system-${browserName}-${width}.png`,
        fullPage: true,
      });
  }
  await page.getByRole("button", { name: "관리자 메뉴 전환" }).click();
  const menu = page.getByRole("dialog", { name: "관리자 메뉴" });
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await page.getByRole("button", { name: "관리자 메뉴 전환" }).click();
  await menu.getByRole("link", { name: "이용 통계" }).click();
  await expect(menu).not.toBeVisible();
  const summary = page.getByRole("button", { name: "2026-11-16 상세 보기" });
  await page.keyboard.press("Tab");
  await summary.focus();
  await expect(summary).toBeFocused();
  expect(
    await summary.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).toBe("solid");
  await summary.press("Enter");
  await expect(summary).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("radio", { name: "30일", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "30일", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  empty = true;
  await page.getByRole("button", { name: "새로고침", exact: true }).click();
  await expect(
    page.getByText("이용 데이터가 쌓이면 여기에 표시돼요"),
  ).toBeVisible();
});
