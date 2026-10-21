import { expect, type Page } from "@playwright/test";

export async function openComposer(page: Page) {
  const input = page.getByLabel("전하고 싶은 마음");
  if (!(await input.isVisible())) {
    await page
      .getByRole("button", { name: "다른 마음이 있어요", exact: true })
      .click();
    await expect(input).toBeVisible();
  }
  return input;
}
