import { test, expect } from "@playwright/test";
const password = process.env.SEED_PASSWORD || "change-this-before-deployment";
test("advanced registers planning analytics deep search and multi-line procurement work in the browser", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Work email").fill("admin@sitecraft.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await page.goto("/control");
  await expect(
    page.getByRole("heading", { name: "Project control room" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cost trajectory" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/advanced-control.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter(
          (e) =>
            e.textContent?.trim() &&
            e.getClientRects().length &&
            parseFloat(getComputedStyle(e).fontSize) < 14,
        )
        .map((e) => ({ tag: e.tagName, size: getComputedStyle(e).fontSize })),
    ),
  ).toEqual([]);
  await page.goto("/planning");
  await expect(
    page.getByRole("heading", { name: "Project planning" }),
  ).toBeVisible();
  await expect(
    page.getByText("Site preparation", { exact: false }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/advanced-timeline.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Execution board" }).click();
  await expect(page.locator(".kanban-board")).toBeVisible();
  await expect(page.locator(".task-card")).toHaveCount(11);
  for (const route of [
    "procurement",
    "commercial",
    "budget-versions",
    "risks",
    "rfis",
    "site-diary",
    "approvals",
    "automation",
    "activity",
  ]) {
    await page.goto("/" + route);
    await expect(page.locator("#workspace-main h1")).toBeVisible();
  }
  await page.goto("/commercial?register=measurementbill");
  await expect(
    page.getByRole("tab", { name: "Measurement bills" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("cell", { name: "RA-GWR-STRUCT-001", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Export register", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("measurementbill.csv");
  await page.getByRole("button", { name: "Search workspace" }).click();
  await page
    .getByRole("textbox", { name: "Global project search" })
    .fill("RFI-GWR-017");
  await page.getByRole("button", { name: /RFI-GWR-017/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText(
      "Please confirm the opening size and additional reinforcement detail before the next slab pour.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/procurement");
  await page
    .getByRole("button", { name: "New purchase order", exact: true })
    .click();
  const reference = `BROWSER-PO-${Date.now()}`;
  await page.getByLabel("Reference number", { exact: true }).fill(reference);
  await page
    .getByLabel("Receiving site", { exact: true })
    .selectOption("site-main");
  await page.getByLabel("Supplier", { exact: true }).selectOption("supplier-1");
  await page
    .getByLabel("Line 1 item", { exact: true })
    .selectOption("material-1");
  await page.getByLabel("Line 1 quantity", { exact: true }).fill("3");
  await page.getByLabel("Line 1 rate", { exact: true }).fill("580");
  await page.getByLabel("Line 1 cost code", { exact: true }).fill("CONCRETE");
  await page.getByRole("button", { name: "Add line", exact: true }).click();
  await page
    .getByLabel("Line 2 item", { exact: true })
    .selectOption("material-3");
  await page.getByLabel("Line 2 quantity", { exact: true }).fill("4");
  await page.getByLabel("Line 2 rate", { exact: true }).fill("2200");
  await page.getByLabel("Line 2 cost code", { exact: true }).fill("CONCRETE");
  await page
    .getByRole("button", { name: "Create purchase order", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("cell", { name: reference, exact: true }),
  ).toBeVisible();
  const row = page
    .getByRole("cell", { name: reference, exact: true })
    .locator("..");
  await row.getByRole("button", { name: "Submitted", exact: false }).click();
  await page
    .getByRole("button", { name: "Confirm submitted", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(row.getByText("Submitted", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/control");
  await expect(
    page.getByRole("heading", { name: "Project control room" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/advanced-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
