import { request } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { testOrigin } from "./matrix";
import { currentTotp } from "./support/totp";

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

    const enable = await context.post("/api/auth/two-factor/enable", {
      data: {
        password: "creeper-responsive-password",
        method: "totp",
      },
    });
    if (enable.status() !== 200) {
      throw new Error(`Browser MFA setup failed (${enable.status()}): ${await enable.text()}`);
    }
    const enrollment = await enable.json() as { totpURI: string };
    const secret = new URL(enrollment.totpURI).searchParams.get("secret");
    if (!secret) throw new Error("Browser MFA setup did not return a TOTP secret.");

    const verify = await context.post("/api/auth/two-factor/verify-totp", {
      data: { code: currentTotp(secret) },
    });
    if (verify.status() !== 200) {
      throw new Error(`Browser MFA verification failed (${verify.status()}): ${await verify.text()}`);
    }

    const sessionResponse = await context.get("/api/auth/get-session");
    const session = await sessionResponse.json() as {
      session?: { mfaVerifiedAt?: string | null };
      user?: { twoFactorEnabled?: boolean };
    };
    if (!session.user?.twoFactorEnabled || !session.session?.mfaVerifiedAt) {
      throw new Error("Browser test session is missing the required MFA assurance.");
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
