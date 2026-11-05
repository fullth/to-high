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
          status: 302,
          headers: { Location: `http://127.0.0.1:3103/auth/callback#token=mock-token&state=${url.searchParams.get("state")}` },
        });
      if (route.request().url().endsWith("/auth/me"))
        return route.fulfill({ headers, json: { userId: "admin", email: "admin@example.invalid" } });
      if (route.request().url().endsWith("/admin/budget"))
        return route.fulfill({ headers, json: {
          balanceMilliWon: 10000000,
          reservedMilliWon: 1000,
          evaluatedWeek: "2026-11-01T15:00:00.000Z",
          notificationReady: true,
          credits: [],
        } });
      return route.fulfill({ status: 404, headers });
    });
    await page.goto("/admin/budget");
    await page.getByRole("button", { name: `${provider} 로그인` }).click();
    await expect(page).toHaveURL(/\/admin\/budget$/);
    await expect(page.getByText("10,000원", { exact: false })).toBeVisible();
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
          evaluatedWeek: "2026-11-01T15:00:00.000Z",
          notificationReady: true,
          credits: [],
        },
      });
    return route.fulfill({ status: 404, headers });
  });
  await page.goto("/admin/budget");
  await page.getByRole("button", { name: "예산 충전" }).click();
  await expect(page.locator("p[role=alert]")).toContainText(
    "충전 결과를 확인하지 못했어요",
  );
  await page.reload();
  await page.getByRole("button", { name: "충전 결과 다시 확인" }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[0]).toEqual(requests[1]);
  await expect(page.getByRole("button", { name: "예산 충전" })).toBeVisible();
});
