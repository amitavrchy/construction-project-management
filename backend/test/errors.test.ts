import { test } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { Errors } from "../src/errors";
test("internal errors are hidden while domain validation remains actionable", () => {
  let status = 0,
    body: any;
  const response = {
    status: (value: number) => {
      status = value;
      return response;
    },
    json: (value: any) => {
      body = value;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as any;
  new Errors().catch(new Error("private internal diagnostic"), host);
  assert.equal(status, 500);
  assert.equal(body.message.includes("private"), false);
  new Errors().catch(
    new BadRequestException("Independent approval required"),
    host,
  );
  assert.equal(status, 400);
  assert.equal(body.message, "Independent approval required");
});
