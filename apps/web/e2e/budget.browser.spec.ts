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
        return route.fulfill({ headers, json: { userId: "admin", email: "admin@example.invalid" } });
      if (route.request().url().endsWith("/admin/budget"))
        return route.fulfill({ headers, json: {
          balanceMilliWon: 10000000,
          reservedMilliWon: 1000,
          accounting: { startedAt: "2026-11-12T00:00:00.000Z", carryoverMilliWon: 10000000, approvedMilliWon: 0, settledMilliWon: 0 },
          notificationReady: true,
          credits: [],
        } });
      return route.fulfill({ status: 404, headers });
    });
    await page.goto("/admin/budget");
    await page.getByRole("button", { name: `${provider} 로그인` }).click();
    await expect(page).toHaveURL(/\/admin\/budget$/);
    await expect(page.getByLabel("AI 운영 예산").getByText("총 운영 한도:", { exact: false })).toContainText("10,000원");
    await expect(page.getByText("처리 중 / 확인 필요 금액: 1원")).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("authReturnTo"))).toBeNull();
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
          accounting: { startedAt: "2026-11-12T00:00:00.000Z", carryoverMilliWon: 10000000, approvedMilliWon: 0, settledMilliWon: 0 },
          notificationReady: true,
          credits: [],
        },
      });
    return route.fulfill({ status: 404, headers });
  });
  await page.goto("/admin/budget");
  await page.getByRole("button", { name: "한도 10,000원 추가 승인" }).click();
  await expect(page.locator("p[role=alert]")).toContainText(
    "승인 결과를 확인하지 못했어요",
  );
  await page.reload();
  await page.getByRole("button", { name: "같은 승인 요청 다시 확인" }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0].amountWon).toBe(10000);
  await expect(page.getByRole("button", { name: "한도 10,000원 추가 승인" })).toBeVisible();
});
