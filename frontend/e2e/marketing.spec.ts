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
    expect(railWidth).toBeCloseTo(width * 0.8, 0);
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

test("motion scrubs only with scroll, reverses, pauses and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Pause motion", exact: true });
  await expect(pause).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const transform = () =>
    page
      .locator(".sc-floating-card")
      .evaluate((element) => getComputedStyle(element, null).transform);
  const initial = await transform();
  // Deliberately sample elapsed time to catch accidental autoplay.
  await page.waitForTimeout(180);
  expect(await transform()).toBe(initial);
  await page.evaluate(() => window.scrollTo({ top: 320, behavior: "instant" }));
  await expect.poll(transform).not.toBe(initial);
  const scrolled = await transform();
  await page.waitForTimeout(180);
  expect(await transform()).toBe(scrolled);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(transform).toBe(initial);
  await pause.click();
  await page.evaluate(() => window.scrollTo({ top: 480, behavior: "instant" }));
  await page.waitForTimeout(100);
  expect(await transform()).toBe(initial);
  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .click();
  await expect.poll(transform).not.toBe(initial);
  const feature = page.locator(".sc-feature-grid article").first();
  const featureTop = await feature.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await page.evaluate(
    (top) =>
      window.scrollTo({ top: top - innerHeight * 0.9, behavior: "instant" }),
    featureTop,
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const before = await feature.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await page.evaluate(() => window.scrollBy({ top: 220, behavior: "instant" }));
  await expect
    .poll(() =>
      feature.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(pause).toBeHidden();
  await expect.poll(transform).toBe("none");
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await transform()).toBe("none");
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
});

for (const width of [360, 1280]) {
  test(`section links and FAQ expand/collapse transition smoothly at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Pause motion", exact: true }),
    ).toBeVisible();
    await page.locator('header a[href="#platform"]').click();
    const target = page.locator("#platform");
    const destination = await target.evaluate(
      (element) =>
        element.getBoundingClientRect().top +
        scrollY -
        parseFloat(getComputedStyle(element).scrollMarginTop),
    );
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    expect(await page.evaluate(() => scrollY)).toBeLessThan(destination - 5);
    await expect
      .poll(() =>
        page.evaluate(
          (destination) => Math.abs(scrollY - destination),
          destination,
        ),
      )
      .toBeLessThan(2);
    await expect(page).toHaveURL(/#platform$/);
    await page.locator('header a[href="#questions"]').click();
    const faqDestination = await page
      .locator("#questions")
      .evaluate(
        (element) =>
          element.getBoundingClientRect().top +
          scrollY -
          parseFloat(getComputedStyle(element).scrollMarginTop),
      );
    await expect
      .poll(() =>
        page.evaluate(
          (destination) => Math.abs(scrollY - destination),
          faqDestination,
        ),
      )
      .toBeLessThan(2);
    const details = page.locator(".sc-faq details").first();
    const summary = details.locator("summary");
    const activateSummary = async () => {
      const box = await summary.boundingBox();
      if (!box) throw new Error("FAQ summary must be visible");
      await page.mouse.click(box.x + 20, box.y + Math.min(20, box.height / 2));
    };
    const collapsed = await details.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await activateSummary();
    expect(
      await details.evaluate((element) =>
        element
          .getAnimations()
          .some((animation) => animation.playState === "running"),
      ),
    ).toBe(true);
    await expect
      .poll(() =>
        details.evaluate((element) => element.getBoundingClientRect().height),
      )
      .toBeGreaterThan(collapsed + 8);
    await details.evaluate((element) =>
      Promise.all(
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      ),
    );
    await activateSummary();
    expect(
      await details.evaluate((element) => (element as HTMLDetailsElement).open),
    ).toBe(true);
    await expect
      .poll(() =>
        details.evaluate((element) => (element as HTMLDetailsElement).open),
      )
      .toBe(false);
    expect(
      await details.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeCloseTo(collapsed, 0);
    // Changing direction during a transition must settle at the latest requested state.
    await activateSummary();
    await activateSummary();
    await activateSummary();
    await details.evaluate((element) =>
      Promise.all(
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      ),
    );
    expect(
      await details.evaluate((element) => (element as HTMLDetailsElement).open),
    ).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect
      .poll(() =>
        page.evaluate(
          () => getComputedStyle(document.documentElement).scrollBehavior,
        ),
      )
      .toBe("auto");
    await activateSummary();
    expect(
      await details.evaluate((element) => (element as HTMLDetailsElement).open),
    ).toBe(false);
    expect(
      await details.evaluate((element) => element.getAnimations().length),
    ).toBe(0);
  });
}
