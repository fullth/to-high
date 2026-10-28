import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
const state = "a".repeat(64);
const cases = [
  { name: "matching request", successful: true, saved: true, state, age: 0 },
  { name: "unsolicited token", successful: false, saved: false, state, age: 0 },
  {
    name: "mismatched state",
    successful: false,
    saved: true,
    state: "b".repeat(64),
    age: 0,
  },
  {
    name: "expired request",
    successful: false,
    saved: true,
    state,
    age: 11 * 60 * 1000,
  },
  {
    name: "legacy query token",
    successful: false,
    saved: true,
    state,
    age: 0,
    query: true,
  },
];
for (const scenario of cases) {
  const { successful } = scenario;
  test(`new-product OAuth callback ${scenario.name} never claims or restores original counseling`, async ({
    page,
  }) => {
    await page.addInitScript(({ saved, age }) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "yes");
      if (saved)
        sessionStorage.setItem(
          "oauthLoginRequest",
          JSON.stringify({
            state: "a".repeat(64),
            createdAt: Date.now() - age,
          }),
        );
      localStorage.setItem("pendingClaimSession", "507f1f77bcf86cd799439011");
      localStorage.setItem(
        "guestSession:507f1f77bcf86cd799439011",
        "legacy-proof",
      );
    }, scenario);
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
    await page.goto(
      `/auth/callback${scenario.query ? "?" : "#"}token=offline-jwt&state=${scenario.state}`,
    );
    await expect(page).toHaveURL(
      `/talk${successful ? "" : "?error=auth_failed"}`,
    );
    expect(claims).toBe(0);
    expect(
      await page.evaluate(() => sessionStorage.getItem("oauthLoginRequest")),
    ).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBe(
      successful ? "offline-jwt" : null,
    );
    if (successful) {
      // A consumed request cannot install another token when its callback is replayed.
      await page.goto(`/auth/callback#token=replayed-jwt&state=${state}`);
      await expect(page).toHaveURL("/talk?error=auth_failed");
      expect(
        await page.evaluate(() => localStorage.getItem("accessToken")),
      ).toBe("offline-jwt");
    }
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

test("login helper creates the state that its callback must consume", async ({
  page,
}) => {
  const origin = new URL(test.info().project.use.baseURL!).origin;
  let sentState: string | null = null;
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin && url.pathname === "/oauth-test-fixture") {
      // Exercise the real helper without enabling the unreleased character UI.
      const source = ts.transpileModule(
        readFileSync(resolve(__dirname, "../src/lib/oauth.ts"), "utf8"),
        {
          compilerOptions: {
            target: ts.ScriptTarget.ES2017,
            module: ts.ModuleKind.ESNext,
          },
        },
      ).outputText;
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: `<button id="login">로그인 테스트</button><script type="module">${source}
        document.getElementById("login").onclick = () => {
          window.location.href = createOAuthLoginUrl("https://provider.test", "google");
        };
      </script>`,
      });
    }
    if (url.origin === origin) return route.continue();
    if (url.pathname === "/auth/google") {
      sentState = url.searchParams.get("state");
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: "Synthetic identity provider",
      });
    }
    if (url.pathname === "/auth/me")
      return route.fulfill({
        json: { userId: "owner", name: "테스트", email: null },
      });
    return route.fulfill({ json: [] });
  });
  await page.goto("/oauth-test-fixture");
  await page.getByRole("button", { name: "로그인 테스트" }).click();
  await expect(page).toHaveURL(/\/auth\/google\?state=[a-f0-9]{64}$/);
  expect(sentState).toMatch(/^[a-f0-9]{64}$/);
  await page.goto(
    `${origin}/auth/callback#token=button-flow-jwt&state=${sentState}`,
  );
  await expect(page).toHaveURL("/talk");
  expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBe(
    "button-flow-jwt",
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("oauthLoginRequest")),
  ).toBeNull();
});
