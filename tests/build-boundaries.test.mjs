import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

// These are the interactive entry modules that each route actually needs.
// Check the production manifest, not source import spelling or minifier output.
const routes = {
  "(auth)/login": ["login-form.tsx"],
  "(auth)/register": ["register-form.tsx"],
  "(auth)/two-factor": ["two-factor-challenge-form.tsx"],
  "(auth)/two-factor/setup": ["sign-out-button.tsx", "two-factor-enrollment.tsx"],
  "(protected)/account": ["change-password-form.tsx", "sign-out-button.tsx"],
};

for (const [route, expected] of Object.entries(routes)) {
  test(`${route} references only its own auth client entries`, () => {
    const context = {};
    vm.runInNewContext(readFileSync(`.next/server/app/${route}/page_client-reference-manifest.js`, "utf8"), context);
    const manifests = Object.values(context.__RSC_MANIFEST);
    assert.equal(manifests.length, 1);
    const entries = Object.keys(manifests[0].clientModules)
      .filter((file) => file.includes("/features/auth/components/"))
      .map((file) => file.split("/").at(-1))
      .filter((file) => file !== "auth-password-input.tsx");
    assert.deepEqual([...new Set(entries)].sort(), [...expected].sort());
  });
}
