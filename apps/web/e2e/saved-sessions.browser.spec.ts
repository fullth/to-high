import { expect, test } from "@playwright/test";

test("explicitly saves, lists, reopens and deletes a conversation", async ({ page }) => {
  let saved: { id: string; title: string; messages: { role: string; content: string }[] } | null = null;
  let saves = 0;
  await page.addInitScript(() => localStorage.setItem("accessToken", "synthetic-token"));
  await page.route("http://127.0.0.1:3999/**", async (route) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/me") return route.fulfill({ headers, json: { userId: "synthetic-user", email: "test@example.invalid" } });
    if (url.pathname === "/ephemeral/respond") return route.fulfill({ headers, json: { reply: "조금 더 이야기해 주세요.", options: ["직장 이야기예요"] } });
    if (url.pathname === "/saved-sessions" && route.request().method() === "GET") return route.fulfill({ headers, json: { sessions: saved ? [{ id: saved.id, title: saved.title, createdAt: new Date().toISOString() }] : [] } });
    if (url.pathname === "/saved-sessions" && route.request().method() === "POST") {
      saves++;
      saved = { ...route.request().postDataJSON(), title: "일에 관한 고민" };
      return route.fulfill({ headers, json: { id: saved!.id, title: saved!.title } });
    }
    if (url.pathname.startsWith("/saved-sessions/") && route.request().method() === "GET") return route.fulfill({ headers, json: saved });
    if (url.pathname.startsWith("/saved-sessions/") && route.request().method() === "DELETE") { saved = null; return route.fulfill({ headers, json: { deleted: true } }); }
    return route.fulfill({ status: 404, headers });
  });
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto("/talk");
  await page.getByRole("button", { name: "일 때문에 힘들어요" }).click();
  await expect(page.getByText("조금 더 이야기해 주세요.")).toBeVisible();
  expect(saves).toBe(0);
  await page.getByRole("button", { name: "상담 종료", exact: true }).click();
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await expect(page.getByRole("button", { name: "일에 관한 고민", exact: true })).toBeVisible();
  expect(saves).toBe(1);
  await page.getByRole("button", { name: "일에 관한 고민", exact: true }).click();
  await expect(page.getByText("조금 더 이야기해 주세요.")).toBeVisible();
  await page.getByRole("button", { name: "일에 관한 고민 삭제" }).click();
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect(page.getByText("저장된 상담이 없어요.")).toBeVisible();
});

test("guest can erase a conversation without saving it", async ({ page }) => {
  let saves = 0;
  await page.route("http://127.0.0.1:3999/**", (route) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,x-browser-id", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (route.request().url().endsWith("/saved-sessions")) saves++;
    return route.fulfill({ headers, json: { reply: "잘 들었어요.", options: ["더 이야기할게요"] } });
  });
  await page.goto("/talk");
  await page.getByRole("button", { name: "일 때문에 힘들어요" }).click();
  await expect(page.getByText("잘 들었어요.")).toBeVisible();
  await page.getByRole("button", { name: "상담 종료", exact: true }).click();
  await page.getByRole("button", { name: "대화 내용 지우기" }).click();
  await expect(page.getByText("상담을 마쳤어요. 이 화면의 대화 원문과 입력을 지웠어요.")).toBeVisible();
  expect(saves).toBe(0);
});

test("guest can confirm saving after returning from login", async ({ page }) => {
  let saves = 0;
  await page.route("http://127.0.0.1:3999/**", (route) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,x-browser-id", "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/google") return route.fulfill({ status: 302, headers: { Location: `http://127.0.0.1:3101/auth/callback#token=synthetic-token&state=${url.searchParams.get("state")}` } });
    if (url.pathname === "/auth/me") return route.fulfill({ headers, json: { userId: "synthetic-user", email: "test@example.invalid" } });
    if (url.pathname === "/saved-sessions" && route.request().method() === "GET") return route.fulfill({ headers, json: { sessions: [] } });
    if (url.pathname === "/saved-sessions" && route.request().method() === "POST") { saves++; return route.fulfill({ headers, json: { id: route.request().postDataJSON().id, title: "상담 제목" } }); }
    return route.fulfill({ headers, json: { reply: "잘 들었어요.", options: ["더 이야기할게요"] } });
  });
  await page.goto("/talk");
  await page.getByRole("button", { name: "일 때문에 힘들어요" }).click();
  await expect(page.getByText("잘 들었어요.")).toBeVisible();
  await page.getByRole("button", { name: "상담 종료", exact: true }).click();
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await expect(page.getByText("로그인이 완료됐어요. 저장하기를 눌러 이 계정에 대화를 저장해 주세요.")).toBeVisible();
  expect(saves).toBe(0);
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await expect.poll(() => saves).toBe(1);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("pendingExplicitConversationSave"))).toBeNull();
});

test("mobile can open the saved list and use the end dialog", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript(() => localStorage.setItem("accessToken", "synthetic-token"));
  await page.route("http://127.0.0.1:3999/**", (route) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/me") return route.fulfill({ headers, json: { userId: "synthetic-user" } });
    if (url.pathname === "/saved-sessions") return route.fulfill({ headers, json: { sessions: [{ id: "a".repeat(32), title: "일에 관한 고민", createdAt: new Date().toISOString() }] } });
    return route.fulfill({ headers, json: {} });
  });
  await page.goto("/talk");
  await page.getByRole("button", { name: "저장된 상담", exact: true }).click();
  await expect(page.getByRole("button", { name: "일에 관한 고민", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "상담 종료", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "상담을 마칠까요?" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
