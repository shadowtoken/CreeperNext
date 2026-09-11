import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { analyzeArchitecture } from "../scripts/lib/architecture.mjs";

function check(files, compilerOptions) {
  return analyzeArchitecture({
    sources: new Map(Object.entries(files)),
    rootDir: path.resolve("/virtual/creeper"),
    compilerOptions,
  });
}
const has = (issues, rule) => issues.some((issue) => issue.rule === rule);

test("aliases, relative imports, re-exports, require and dynamic imports obey the same layer rule", () => {
  for (const statement of [
    'import { secret } from "@/server/secret";',
    'import { secret } from "../../server/secret";',
    'export { secret } from "../../server/secret";',
    'const secret = require("../../server/secret");',
    'const secret = import("../../server/secret.js");',
    'import secret = require("../../server/secret");',
  ]) {
    const issues = check({
      "components/ui/button.ts": statement,
      "server/secret.ts": 'import "server-only"; export const secret = 1;',
    });
    assert.ok(has(issues, "layer"), statement);
    assert.ok(!has(issues, "unresolved-import"), statement);
  }
});

test("custom tsconfig aliases resolve to their real ownership", () => {
  assert.ok(has(check({
    "components/shared/header.ts": 'import { Login } from "@auth/components/login";',
    "features/auth/components/login.ts": "export const Login = 1;",
  }, { paths: { "@auth/*": ["features/auth/*"] } }), "layer"));
});

test("cross-domain callers use public entries while internal feature imports stay private", () => {
  const base = {
    "features/auth/login.ts": 'export { Login } from "./components/login";',
    "features/auth/components/login.ts": 'import { validate } from "../lib/validate"; export const Login = validate;',
    "features/auth/lib/validate.ts": "export const validate = 1;",
  };
  assert.deepEqual(check({ ...base, "app/page.ts": 'import { Login } from "@/features/auth/login";' }), []);
  for (const caller of ["app/page.ts", "features/marketing/components/card.ts"]) {
    assert.ok(has(check({ ...base, [caller]: 'import { Login } from "@/features/auth/components/login";' }), "feature-private"));
  }
});

test("client reachability follows neutral re-exports into private config and schema", () => {
  for (const target of ["config/database.ts", "server/db/schema/auth.ts"]) {
    const issues = check({
      "features/auth/components/login.ts": '"use client"; import { value } from "../lib/helper";',
      "features/auth/lib/helper.ts": `export { value } from "@/${target.replace(/\.ts$/, "")}";`,
      [target]: "export const value = 1;",
    });
    assert.ok(issues.some((issue) => issue.rule === "client-server" && issue.message.includes("helper.ts ->")));
  }
});

test("client imports of server packages and modules with server-only are rejected", () => {
  for (const dependency of ["pg", "drizzle-orm", "node:fs", "fs/promises", "next/headers", "better-auth"]) {
    assert.ok(has(check({ "app/client.ts": `"use client"; import value from "${dependency}";` }), "client-server"));
  }
  assert.ok(has(check({
    "app/client.ts": '"use client"; import { value } from "@/features/auth/login";',
    "features/auth/login.ts": 'import "server-only"; export const value = 1;',
  }), "client-server"));
});

test("explicit Server Action references are allowed without walking their server implementation", () => {
  assert.deepEqual(check({
    "features/auth/components/form.ts": '"use client"; import { save } from "../actions";',
    "features/auth/actions.ts": '"use server"; import "server-only"; import { write } from "./lib/server/write"; export async function save() { await write(); }',
    "features/auth/lib/server/write.ts": 'import "server-only"; import { db } from "@/server/db/client"; export async function write() { return db; }',
    "server/db/client.ts": 'import "server-only"; export const db = 1;',
  }), []);
});

test("server and feature-server modules require markers; generated schema remains CLI compatible", () => {
  assert.ok(has(check({ "server/auth.ts": "export const value = 1;" }), "server-marker"));
  assert.ok(has(check({ "features/auth/lib/server/query.ts": "export const value = 1;" }), "server-marker"));
  assert.deepEqual(check({ "server/db/schema/auth.ts": 'import { pgTable } from "drizzle-orm/pg-core";' }), []);
});

test("feature server logic can share validation but cannot reach browser SDKs or UI", () => {
  const base = {
    "features/auth/lib/server/profile.ts": 'import "server-only"; import { validate } from "../validate";',
    "features/auth/lib/validate.ts": "export const validate = 1;",
  };
  assert.deepEqual(check(base), []);
  assert.ok(has(check({
    ...base,
    "features/auth/lib/validate.ts": 'import { client } from "@/services/api/auth/client"; export const validate = client;',
    "services/api/auth/client.ts": '"use client"; export const client = 1;',
  }), "server-client"));
  assert.ok(has(check({
    "features/auth/lib/server/profile.ts": 'import "server-only"; import { Form } from "../../components/form";',
    "features/auth/components/form.ts": "export const Form = 1;",
  }), "layer"));
});

test("framework types cannot bypass core boundaries; DTO-only cycles have no runtime edge", () => {
  assert.ok(has(check({ "core/model.ts": 'import type { ReactNode } from "react";' }), "framework"));
  assert.deepEqual(check({
    "types/domain/a.ts": 'import type { B } from "./b"; export type A = { b?: B };',
    "types/domain/b.ts": 'export type B = { a?: import("./a").A };',
  }), []);
  assert.ok(has(check({
    "core/a.ts": 'export { value } from "./b";',
    "core/b.ts": 'import { value } from "./a"; export { value };',
  }), "cycle"));
});

test("hooks and types are covered, including bracket and destructured environment reads", () => {
  for (const file of ["hooks/use-state.ts", "types/api/data.ts", "features/auth/lib/helper.ts"]) {
    for (const expression of ['process.env.KEY', 'process["env"].KEY', 'globalThis.process.env.KEY', 'const { env: settings } = process']) {
      assert.ok(has(check({ [file]: expression }), "environment"), `${file}: ${expression}`);
    }
  }
  assert.deepEqual(check({ "config/database.ts": 'export const value = process.env.DATABASE_URL;' }), []);
  assert.ok(has(check({ "server/helper.ts": 'import "server-only"; import { env as settings } from "node:process";' }), "environment"));
  assert.deepEqual(check({ "lib/example.ts": '// process.env.X and NEXT_PUBLIC_X are mentioned in this comment.\nexport const value = 1;' }), []);
});

test("unresolved project paths, nonliteral imports and wildcard feature exports fail explicitly", () => {
  assert.ok(has(check({ "app/page.ts": 'import "@/missing";' }), "unresolved-import"));
  assert.ok(has(check({ "app/page.ts": "import(moduleName);" }), "dynamic-import"));
  assert.ok(has(check({
    "features/auth/login.ts": 'export * from "./components/form";',
    "features/auth/components/form.ts": "export const form = 1;",
  }), "public-exports"));
});

test("broad feature index cannot pull in interactive components; focused server entries can", () => {
  const component = '"use client"; export const Form = 1;';
  assert.ok(has(check({
    "features/auth/index.ts": 'export { Form } from "./components/form";',
    "features/auth/components/form.ts": component,
  }), "feature-index-client"));
  assert.deepEqual(check({
    "app/page.ts": 'import { Form } from "@/features/auth/login";',
    "features/auth/login.ts": 'import "server-only"; export { Form } from "./components/form";',
    "features/auth/components/form.ts": component,
  }), []);
});
