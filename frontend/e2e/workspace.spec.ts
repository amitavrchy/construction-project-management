import { test, expect } from "@playwright/test";
const password = process.env.SEED_PASSWORD || "change-this-before-deployment";
test("desktop workflows render, save, search and export with accessible typography", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/control");
  await page.getByLabel("Work email").fill("admin@sitecraft.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Project control room" }),
  ).toBeVisible();
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Greenwood Residence" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/desktop-overview.png",
    fullPage: true,
  });
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter(
        (e) =>
          e.textContent?.trim() &&
          e.getClientRects().length &&
          parseFloat(getComputedStyle(e).fontSize) < 14,
      )
      .map((e) => ({ tag: e.tagName, size: getComputedStyle(e).fontSize })),
  );
  expect(small).toEqual([]);
  for (const route of [
    "boq",
    "budget",
    "stock",
    "requisition",
    "receipt",
    "issue",
    "return",
    "transfer",
    "material",
    "supplier",
    "attendance",
    "worker",
    "wage",
    "contractor",
    "workorder",
    "bill",
    "progress",
    "document",
    "reports",
    "team",
    "settings",
    "projects",
  ]) {
    await page.goto(`/${route}`);
    await expect(page.locator("#workspace-main h1")).toBeVisible();
  }
  await page.goto("/material");
  await page.getByRole("button", { name: "New material", exact: true }).click();
  const sku = `E2E-${Date.now()}`;
  await page.getByLabel("SKU", { exact: true }).fill(sku);
  await page.getByLabel("Material name").fill("Browser verified cement");
  await page.getByLabel("Unit", { exact: true }).selectOption("bag");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("textbox", { name: "Search Material catalog" })
    .fill(sku);
  await expect(
    page.getByRole("cell", { name: sku, exact: true }),
  ).toBeVisible();
  await page.goto("/reports");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export cost report" }).click();
  expect((await download).suggestedFilename()).toBe("budget-vs-actual.csv");
  await page.goto("/document");
  await page.getByRole("button", { name: "New document", exact: true }).click();
  const documentName = `Drawing verification ${Date.now()}`;
  await page.getByLabel("Document name", { exact: true }).fill(documentName);
  await page
    .getByLabel("PDF or image (max 4 MB)", { exact: true })
    .setInputFiles({
      name: "drawing.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"),
    });
  await expect(
    page.getByLabel("File name (filled on upload)", { exact: true }),
  ).toHaveValue("drawing.pdf");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("cell", { name: documentName, exact: true })
    .locator("..")
    .getByRole("button", { name: "View record details" })
    .click();
  const fileDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download document" }).click();
  expect((await fileDownload).suggestedFilename()).toBe("drawing.pdf");
  await page.getByRole("button", { name: "Close dialog" }).click();
  expect(errors).toEqual([]);
});
test("mobile navigation fits viewport and contractor portal restricts records", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/control");
  await page.getByLabel("Work email").fill("contractor@sitecraft.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Contractor bills" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: "Contractor bills" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Site stock" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Work orders" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Work orders" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Foundation concrete package" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/mobile-portal.png",
    fullPage: true,
  });
});
