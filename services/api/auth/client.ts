"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/** Browser-only Better Auth transport adapter. Product features import this boundary. */
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});
