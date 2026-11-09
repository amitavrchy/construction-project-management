import { test } from "node:test";
import assert from "node:assert/strict";
import { validateUpload } from "../src/uploads";
test("rejects disguised active content and malformed base64", () => {
  assert.throws(() =>
    validateUpload(
      `data:image/png;base64,${Buffer.from("<script>alert(1)</script>").toString("base64")}`,
    ),
  );
  assert.throws(() => validateUpload("data:image/png;base64,A="));
  assert.throws(() =>
    validateUpload("data:application/pdf;base64,JVBERi0=", true),
  );
});
test("accepts PDF and PNG signatures and enforces byte limits", () => {
  validateUpload("data:application/pdf;base64,JVBERi0=");
  validateUpload(
    `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64")}`,
    true,
  );
  assert.throws(() =>
    validateUpload(
      `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64")}`,
      true,
    ),
  );
});
