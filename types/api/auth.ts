/** Transport shapes shared by auth API adapters. Provider-specific responses stay server-side. */
export type AuthError = { code?: string; message?: string; status?: number };
export type SessionResponse = { user: { id: string; email: string; name?: string | null }; session: { id: string; mfaVerifiedAt?: Date | string | null } } | null;
