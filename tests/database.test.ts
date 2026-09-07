import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { databaseUrl, databasePoolSize } from "../config/database";
import { account, session, user } from "../server/db/schema/auth";
import { createTestDatabase, validateTestDatabaseUrl } from "./support/database.mjs";

test("database configuration fails without leaking credentials", () => {
  assert.equal(databasePoolSize(undefined), 5);
  assert.equal(databasePoolSize("2"), 2);
  for (const value of ["0", "101", "2.5", "NaN", "-1"]) {
    assert.throws(() => databasePoolSize(value), /DATABASE_POOL_MAX/);
  }
  for (const value of [undefined, "sqlite:auth.sqlite", "postgresql://host", "https://user:secret@host/db"]) {
    assert.throws(() => databaseUrl(value), (error: Error) => {
      assert.match(error.message, /DATABASE_URL/);
      assert.doesNotMatch(error.message, /secret|auth.sqlite/);
      return true;
    });
  }
  assert.equal(databaseUrl("postgresql://user:pass@localhost/app"), "postgresql://user:pass@localhost/app");
  for (const value of [
    undefined,
    "postgresql://user:pass@localhost/production",
    "postgresql://user:pass@localhost/app_test/other",
    "postgresql://user:pass@localhost/app_test?database=production",
    "postgresql://user:pass@localhost/app_test?host=production.example",
  ]) {
    assert.throws(() => validateTestDatabaseUrl(value), /TEST_DATABASE_URL/);
  }
});

test("PostgreSQL migrations preserve data and enforce transactions and auth constraints", async () => {
  const database = await createTestDatabase();
  const pool = new Pool({ connectionString: database.url, max: 2 });
  const db = drizzle(pool);
  try {
    const id = randomUUID();
    const [created] = await db.insert(user).values({
      id, name: "Database test", email: "database@example.com",
    }).returning();
    assert.equal(created.emailVerified, false);
    assert.equal(created.twoFactorEnabled, false);
    assert.ok(created.createdAt instanceof Date);

    // Applying the same migration again must preserve existing rows.
    await migrate(db, { migrationsFolder: "./drizzle" });
    assert.equal((await db.select().from(user).where(eq(user.id, id))).length, 1);

    await assert.rejects(db.insert(user).values({
      id: randomUUID(), name: "Duplicate", email: created.email,
    }), hasDatabaseCode("23505"));

    const expiresAt = new Date(Date.now() + 60_000);
    await assert.rejects(db.insert(session).values({
      id: randomUUID(), token: randomUUID(), userId: "missing-user", expiresAt,
    }), hasDatabaseCode("23503"));

    await db.insert(account).values({
      id: randomUUID(), issuer: "credential", accountId: id, providerId: "credential", userId: id,
    });
    await assert.rejects(db.insert(account).values({
      id: randomUUID(), issuer: "credential", accountId: id, providerId: "credential", userId: id,
    }), hasDatabaseCode("23505"));

    await assert.rejects(db.transaction(async (tx) => {
      await tx.update(user).set({ name: "Must roll back" }).where(eq(user.id, id));
      throw new Error("intentional rollback");
    }), /intentional rollback/);
    assert.equal((await db.select().from(user).where(eq(user.id, id)))[0].name, "Database test");

    const [savedSession] = await db.insert(session).values({
      id: randomUUID(), token: randomUUID(), userId: id, expiresAt, mfaVerifiedAt: new Date(),
    }).returning();
    assert.ok(savedSession.mfaVerifiedAt instanceof Date);
    await db.delete(user).where(eq(user.id, id));
    assert.equal((await db.select().from(session).where(eq(session.userId, id))).length, 0);
    assert.equal((await db.select().from(account).where(eq(account.userId, id))).length, 0);
  } finally {
    await pool.end();
    await database.dispose();
  }
});

function hasDatabaseCode(code: string) {
  return (error: unknown) => error instanceof Error
    && typeof error.cause === "object" && error.cause !== null
    && "code" in error.cause && error.cause.code === code;
}
