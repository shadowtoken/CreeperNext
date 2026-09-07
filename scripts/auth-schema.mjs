import nextEnv from "@next/env";
import { generateDrizzleSchema } from "auth/api";
import { writeFile } from "node:fs/promises";
import { tsImport } from "tsx/esm/api";

nextEnv.loadEnvConfig(process.cwd());

// Use the pinned generator API with native module loading. The auth CLI's
// configuration loader does not honor the server-only package condition.
const { auth } = await tsImport("../server/auth-config.ts", import.meta.url);
const output = "server/db/schema/auth.ts";
const result = await generateDrizzleSchema({
  adapter: (await auth.$context).adapter,
  options: auth.options,
  file: output,
});

if (!result.code || result.unsafeChanges?.length) {
  throw new Error("Auth schema generation requires manual review; no file was written.");
}
await writeFile(output, result.code);
console.log(`Generated ${output}. Review the diff before running db:generate.`);
