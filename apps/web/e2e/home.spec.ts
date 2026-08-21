import { test, expect } from "@playwright/test";

test.describe("홈페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("페이지가 정상적으로 로드된다", async ({ page }) => {
    await expect(page).toHaveTitle(/위로.*AI 심리 상담/i);
  });

  test("히어로 섹션이 표시된다", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /지치셨다면, 잘 오셨어요/ }),
    ).toBeVisible();
    await expect(page.getByText(/말할 힘도 없을 때는/)).toBeVisible();
  });

  test("서비스 약속이 표시된다", async ({ page }) => {
    await expect(page.getByText("이런 날, 곁에 있을게요")).toBeVisible();
    await expect(page.getByText("말할 힘도 없는 날")).toBeVisible();
    await expect(page.getByText("조언이 부담스러운 날")).toBeVisible();
    await expect(page.getByText("조용히 풀고 싶은 날")).toBeVisible();
  });

  test("개인정보처리방침 링크가 작동한다", async ({ page }) => {
    const privacyLink = page.getByRole("link", {
      name: "개인정보처리방침",
    });
    await expect(privacyLink).toBeVisible();

    await privacyLink.click();
    await expect(page).toHaveURL("/privacy");
  });

  test("대화 방식 안내가 표시된다", async ({ page }) => {
    await expect(page.getByText("어떤 대화 방식을 선호하세요?")).toBeVisible();
    await expect(page.getByText("그냥 위로받고 싶어요")).toBeVisible();
  });

  test("비로그인 상태에서 익명 시작 안내가 표시된다", async ({ page }) => {
    await expect(page.getByText("가입 없이도 시작할 수 있어요")).toBeVisible();
  });
});
