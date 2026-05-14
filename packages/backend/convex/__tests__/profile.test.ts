/**
 * MODULE 3: User Profile — Unit Tests
 * UC05 | BR23–BR25
 *
 * Tests based on Business Rules from testcase_instruction.md:
 *   PROF-001, PROF-005
 *
 * Source: packages/backend/convex/authSync.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { seedUser } from "./helpers/seed";

const modules = import.meta.glob("../**/*.ts");

// ─── UC05: Manage User Profile ──────────────────────────────────────────────

describe("UC05: Manage User Profile", () => {
  it("[BR23] PROF-001: Returns user profile info", async () => {
    const t = convexTest(schema, modules);

    const userId = await seedUser(t, {
      fullName: "Profile User",
      email: "profile.user@test.com",
      image: "https://example.com/avatar.png",
    });

    const user = await t.query(api.authSync.getUserById, { userId });

    expect(user).not.toBeNull();
    expect(user!.fullName).toBe("Profile User");
    expect(user!.email).toBe("profile.user@test.com");
    expect(user!.image).toBe("https://example.com/avatar.png");
  });

  it("[BR25] PROF-005: Updates user name via syncUser", async () => {
    const t = convexTest(schema, modules);

    await seedUser(t, {
      authId: "ba-user-profile",
      fullName: "Old Name",
      email: "old.name@test.com",
      emailVerified: true,
    });

    await t.mutation(api.authSync.syncUser, {
      authId: "ba-user-profile",
      name: "New Name",
      email: "old.name@test.com",
      emailVerified: true,
      image: undefined,
      createdAt: Date.now() - 1000,
      updatedAt: Date.now(),
    });

    const user = await t.query(api.authSync.getUserByAuthId, {
      authId: "ba-user-profile",
    });

    expect(user).not.toBeNull();
    expect(user!.fullName).toBe("New Name");
  });
});
