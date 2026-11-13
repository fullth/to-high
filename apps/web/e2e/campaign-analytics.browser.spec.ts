import { expect, test } from "@playwright/test";

test("the Practicket ranking ad is measured without forwarding its campaign name", async ({ page }) => {
  await page.route("https://www.googletagmanager.com/gtag/js**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );

  for (const campaign of ["partner-set-name", "위로"]) {
    const query = new URLSearchParams({
      utm_source: "practicket",
      utm_medium: "banner",
      utm_campaign: campaign,
    });
    await page.goto(`/?${query}`);
    await expect
      .poll(() => page.evaluate(() => typeof (window as Window & { gtag?: unknown }).gtag))
      .toBe("function");
    const pageView = await page.evaluate(() =>
      (window as Window & { dataLayer?: IArguments[] }).dataLayer
        ?.map((args) => Array.from(args))
        .find((args) => args[0] === "event" && args[1] === "page_view"),
    );
    expect(pageView?.[2]).toMatchObject({
      page_location: "http://localhost:3001/?utm_source=practicket&utm_medium=banner&utm_campaign=%EC%9C%84%EB%A1%9C",
      page_referrer: "",
    });
  }

  await page.goto("/?utm_source=practicket&utm_medium=banner&utm_campaign=partner-set-name&email=private");
  await page.waitForTimeout(250);
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
});
