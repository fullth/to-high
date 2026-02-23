import { test, expect } from "@playwright/test";

test.describe("홈페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("페이지가 정상적으로 로드된다", async ({ page }) => {
    await expect(page).toHaveTitle(/To high/i);
  });

  test("히어로 섹션이 표시된다", async ({ page }) => {
    await expect(page.getByText("오늘 하루도")).toBeVisible();
    await expect(page.getByText("수고 많으셨어요")).toBeVisible();
  });

  test("차별화 배너가 표시된다", async ({ page }) => {
    // 메인 메시지 확인
    await expect(
      page.getByText("오래 대화할수록, 나만의 상담사가 됩니다")
    ).toBeVisible();

    // 일반 AI와의 차이점 설명 확인
    await expect(
      page.getByText(/일반 AI 채팅은 대화가 길어질수록 느려지고/)
    ).toBeVisible();

    // 차별점 리스트 확인
    await expect(
      page.getByText("대화가 아무리 길어져도 처음부터 끝까지 기억합니다")
    ).toBeVisible();
    await expect(
      page.getByText("과거 상담 기록을 바탕으로 맞춤형 응답을 제공합니다")
    ).toBeVisible();
    await expect(
      page.getByText("대화 내용은 암호화되어 제3자에게 절대 공유되지 않습니다")
    ).toBeVisible();
  });

  test("개인정보처리방침 링크가 작동한다", async ({ page }) => {
    const privacyLink = page.getByRole("link", {
      name: "개인정보처리방침 보기",
    });
    await expect(privacyLink).toBeVisible();

    await privacyLink.click();
    await expect(page).toHaveURL("/privacy");
  });

  test("카테고리 선택 영역이 표시된다", async ({ page }) => {
    await expect(page.getByText("어떤 대화를 시작할까요?")).toBeVisible();
  });

  test("비로그인 상태에서 로그인 유도 배너가 표시된다", async ({ page }) => {
    await expect(
      page.getByText("나만의 상담사를 만들어보세요")
    ).toBeVisible();
  });
});
