import { expect, type Page } from "@playwright/test";

export async function openComposer(page: Page) {
  const input = page.getByLabel("전하고 싶은 마음");
  if (!(await input.isVisible())) {
    await page
      .getByRole("button", { name: "제가 직접 입력할게요", exact: true })
      .click();
    await expect(input).toBeVisible();
  }
  return input;
}
