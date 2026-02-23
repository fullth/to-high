import { test, expect } from "@playwright/test";

test.describe("개인정보처리방침 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/privacy");
  });

  test("페이지가 정상적으로 로드된다", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "개인정보처리방침", exact: true })).toBeVisible();
  });

  test("필수 섹션들이 모두 표시된다", async ({ page }) => {
    // 주요 섹션 제목 확인
    await expect(page.getByRole("heading", { name: "1. 수집하는 개인정보" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "2. 개인정보 수집 및 이용 목적" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "3. 개인정보 보관 및 파기" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "4. 개인정보의 제3자 제공" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "5. 개인정보의 안전성 확보 조치" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "6. 이용자의 권리" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "7. 쿠키 사용" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "8. 개인정보 보호책임자" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "9. 개인정보처리방침 변경" })).toBeVisible();
  });

  test("수집 항목이 명시되어 있다", async ({ page }) => {
    await expect(page.getByText("필수 수집 항목")).toBeVisible();
    await expect(page.getByText(/이메일 주소/).first()).toBeVisible();
    await expect(page.getByText("상담 기록: 대화 내용, 상담 주제, 감정 상태")).toBeVisible();
  });

  test("제3자 제공 업체가 명시되어 있다", async ({ page }) => {
    await expect(page.getByText("업무 위탁 현황")).toBeVisible();
    await expect(page.getByText("토스페이먼츠: 결제 처리 및 빌링키 관리")).toBeVisible();
    await expect(page.getByText(/OpenAI/).first()).toBeVisible();
  });

  test("이용자 권리가 명시되어 있다", async ({ page }) => {
    await expect(page.getByText("개인정보 열람 요청")).toBeVisible();
    await expect(page.getByText("개인정보 삭제 요청")).toBeVisible();
    await expect(page.getByText("개인정보 처리 정지 요청")).toBeVisible();
  });

  test("돌아가기 버튼이 작동한다", async ({ page }) => {
    const backButton = page.getByRole("link", { name: "돌아가기" });
    await expect(backButton).toBeVisible();

    await backButton.click();
    await expect(page).toHaveURL("/");
  });

  test("문의 이메일 링크가 있다", async ({ page }) => {
    const emailLinks = page.getByRole("link", { name: /xoghksdla@gmail.com/ });
    await expect(emailLinks.first()).toBeVisible();
  });
});
