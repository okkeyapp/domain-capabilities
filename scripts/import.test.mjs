import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeDomain } from "./lib/normalizeDomain.mjs";
import { applyOverrides, mergeFromTwoFaDirectory, mergePasskeysDirectory } from "./lib/mergeCatalog.mjs";

describe("normalizeDomain", () => {
  it("strips www and uses registrable heuristic", () => {
    assert.equal(normalizeDomain("www.GitHub.com"), "github.com");
    assert.equal(normalizeDomain("https://login.example.com/path"), "example.com");
  });
});

describe("mergeCatalog", () => {
  it("detects totp support from 2fa.directory v4", () => {
    const entries = mergeFromTwoFaDirectory({
      "github.com": { methods: ["totp", "u2f"] },
      "legacy.example": { methods: ["sms"] },
    });
    assert.equal(entries["github.com"]?.supports2FA, true);
    assert.equal(entries["legacy.example"], undefined);
  });

  it("merges passkeys and overrides", () => {
    let entries = mergeFromTwoFaDirectory({ "paypal.com": { methods: ["totp"] } });
    entries = mergePasskeysDirectory(entries, { "paypal.com": {} });
    entries = applyOverrides(entries, [{ domain: "custom.local", supports2FA: true }]);
    assert.equal(entries["paypal.com"]?.supportsPasskeys, true);
    assert.equal(entries["custom.local"]?.supports2FA, true);
  });
});
