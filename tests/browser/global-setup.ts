import { request } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { testOrigin } from "./matrix";

const authDirectory = path.join(process.cwd(), ".playwright");
export const authStatePath = path.join(authDirectory, "auth-state.json");

export default async function globalSetup() {
  await mkdir(authDirectory, { recursive: true });
  const context = await request.newContext({
    baseURL: testOrigin,
    extraHTTPHeaders: { origin: testOrigin },
  });

  try {
    const signUp = await context.post("/api/auth/sign-up/email", {
      data: {
        name: "响应式测试",
        email: "responsive-browser@example.com",
        password: "creeper-responsive-password",
      },
    });
    if (signUp.status() !== 200) {
      throw new Error(`Browser auth setup failed (${signUp.status()}): ${await signUp.text()}`);
    }

    const signIn = await context.post("/api/auth/sign-in/email", {
      data: {
        email: "responsive-browser@example.com",
        password: "creeper-responsive-password",
      },
    });
    if (signIn.status() !== 200) {
      throw new Error(`Browser sign-in setup failed (${signIn.status()}): ${await signIn.text()}`);
    }
    await context.storageState({ path: authStatePath });
  } catch (error) {
    await rm(authDirectory, { force: true, recursive: true });
    throw error;
  } finally {
    await context.dispose();
  }

  return async () => {
    await rm(authDirectory, { force: true, recursive: true });
  };
}
