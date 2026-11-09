import { test, expect } from "@playwright/test";
for (const width of [360, 768, 1280, 1920]) {
  test(`public landing is responsive at ${width}px without an API`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    const requests: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/**", (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    await page.goto("/");
    const railWidth = await page
      .locator(".sc-nav")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(railWidth).toBeCloseTo(width * 0.9, 0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Build witha clearerpicture.",
    );
    for (const id of ["platform", "showcase", "how-it-works", "questions"]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.getByText("How do I get access?", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Sign in with the account provided", { exact: false }),
    ).toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: "Login", exact: true }),
    ).toHaveAttribute("href", "/control");
    await expect(
      page.locator("header").getByRole("link", { name: "Get started" }),
    ).toHaveAttribute("href", "/control");
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
  });
}
test("complete marketing HTML is usable without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#platform")).toContainText("Keep costs in sight.");
  await expect(page.locator("#showcase")).toContainText("Riverside Residence");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /Sitecraft/,
  );
  expect((await page.request.get("/marketing-og.png")).status()).toBe(200);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await context.close();
});
test("landing CTA reaches the existing company sign-in flow", async ({
  page,
}) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unauthorized" }),
    }),
  );
  await page.goto("/");
  await page
    .locator("header")
    .getByRole("link", { name: "Get started" })
    .click();
  await expect(page).toHaveURL(/\/control$/);
  await expect(
    page.getByRole("button", { name: "Sign in to workspace" }),
  ).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
});

test("motion is visible, pausable and respects reduced-motion preferences", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Pause motion", exact: true });
  await expect(pause).toBeVisible();
  const transform = () =>
    page
      .locator(".sc-floating-card")
      .evaluate((element) => getComputedStyle(element, null).transform);
  const initial = await transform();
  await expect.poll(transform).not.toBe(initial);
  await page
    .locator(".sc-feature-grid article")
    .first()
    .scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".sc-feature-grid article")
        .first()
        .evaluate(
          (element) =>
            element
              .getAnimations()
              .filter((animation) => animation.playState === "running").length,
        ),
    )
    .toBeGreaterThan(0);
  await pause.click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running").length,
      ),
    )
    .toBe(0);
  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running").length,
      ),
    )
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running").length,
      ),
    )
    .toBe(0);
  await expect(
    page.getByRole("button", { name: "Pause motion", exact: true }),
  ).toBeHidden();
});
