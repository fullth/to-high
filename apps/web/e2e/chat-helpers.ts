import { expect, type Page } from "@playwright/test";

export async function openComposer(page: Page) {
  const input = page.getByLabel("전하고 싶은 마음");
  if (!(await input.isVisible())) {
    await page
      .getByRole("button", { name: "직접 입력할게요", exact: true })
      .click();
    await expect(input).toBeVisible();
  }
  return input;
}

export async function endConversation(page: Page) {
  await page.getByRole("button", { name: "상담 종료", exact: true }).click();
  await page.getByRole("button", { name: "대화 내용 지우기", exact: true }).click();
}
