import { expect, test } from "@playwright/test";
for (const successful of [true, false]) {
  test(`new-product OAuth callback ${successful ? "success" : "failure"} never claims or restores original counseling`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "yes");
      localStorage.setItem("pendingClaimSession", "507f1f77bcf86cd799439011");
      localStorage.setItem(
        "guestSession:507f1f77bcf86cd799439011",
        "legacy-proof",
      );
    });
    const appOrigin = new URL(test.info().project.use.baseURL!).origin;
    let claims = 0;
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (new URL(url).origin === appOrigin) return route.continue();
      if (url.endsWith("/claim")) claims++;
      if (url.endsWith("/auth/me"))
        return route.fulfill({
          json: { userId: "owner", name: "테스트", email: null },
        });
      return route.fulfill({ json: [] });
    });
    await page.goto(`/auth/callback${successful ? "?token=offline-jwt" : ""}`);
    await expect(page).toHaveURL(
      `/characters${successful ? "" : "?error=auth_failed"}`,
    );
    expect(claims).toBe(0);
    expect(
      await page.evaluate(() => localStorage.getItem("pendingClaimSession")),
    ).toBeNull();
    expect(
      await page.evaluate(() =>
        localStorage.getItem("guestSession:507f1f77bcf86cd799439011"),
      ),
    ).toBeNull();
  });
}
