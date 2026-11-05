import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`turn limit dialog works at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route("http://127.0.0.1:3999/**", async (route) => {
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization,content-type,x-browser-id",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      };
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (route.request().url().endsWith("/ephemeral/respond"))
        return route.fulfill({ status: 429, headers, json: { code: "DAILY_GUEST_LIMIT" } });
      return route.fulfill({ status: 404, headers });
    });
    await page.goto("/talk");
    await page.getByRole("button", { name: "일 때문에 힘들어요", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "무료 대화 한도에 도달했어요" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("로그인하면 새 대화를 시작할 수 있어요");
    await expect(dialog.getByRole("button", { name: "로그인하기" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`turn-limit-${viewport.width}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
}
