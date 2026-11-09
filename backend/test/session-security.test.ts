import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionMatches,
  passwordWithinLimit,
  loginBucket,
} from "../src/session-security";

test("password changes invalidate prior and unversioned sessions", () => {
  assert.equal(sessionMatches({ version: 0 }, { sessionVersion: 0 }), true);
  assert.equal(sessionMatches({ version: 0 }, { sessionVersion: 1 }), false);
  assert.equal(sessionMatches({}, { sessionVersion: 0 }), false);
});
test("bcrypt passwords are limited by UTF-8 bytes", () => {
  assert.equal(passwordWithinLimit("a".repeat(72)), true);
  assert.equal(passwordWithinLimit("a".repeat(73)), false);
  assert.equal(passwordWithinLimit("界".repeat(25)), false);
});
test("Redis limiter keys do not contain email addresses", () => {
  assert.equal(
    loginBucket("email", "test@example.invalid").includes("@"),
    false,
  );
  assert.equal(loginBucket("email", "x"), loginBucket("email", "x"));
});
