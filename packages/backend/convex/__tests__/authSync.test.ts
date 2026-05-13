/**
 * MODULE 1: Authentication (Auth Sync) — Unit Tests
 * UC01–UC03 | BR01–BR17
 *
 * Tests for: syncUser, deleteUser, syncOrganization, syncMember
 *
 * Source: packages/backend/convex/authSync.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { seedOrganization, seedUser } from "./helpers/seed";

const modules = import.meta.glob("../**/*.ts");

// ─── UC01: User Sync ─────────────────────────────────────────────────────────

describe("UC01: User Sync", () => {
  it("[BR01] AUTH-001: Creates user when missing", async () => {
    const t = convexTest(schema, modules);

    const authId = "ba-user-new";
    const now = Date.now();

    const userId = await t.mutation(api.authSync.syncUser, {
      authId,
      name: "New User",
      email: "new.user@test.com",
      emailVerified: false,
      image: undefined,
      createdAt: now,
      updatedAt: now,
    });

    const user = await t.query(api.authSync.getUserByAuthId, { authId });

    expect(userId).toBeDefined();
    expect(user).not.toBeNull();
    expect(user!.fullName).toBe("New User");
    expect(user!.email).toBe("new.user@test.com");
    expect(user!.emailVerified).toBe(false);
    expect(user!.username).toBe("new.user");
    expect(user!.isActive).toBe(true);
    expect(user!.isDeleted).toBe(false);
  });

  it("[BR02] AUTH-002: Updates user when exists", async () => {
    const t = convexTest(schema, modules);

    const existingId = await seedUser(t, {
      authId: "ba-user-1",
      fullName: "Old Name",
      email: "old@test.com",
      emailVerified: false,
      username: "oldname",
    });

    const updatedAt = Date.now();

    const resultId = await t.mutation(api.authSync.syncUser, {
      authId: "ba-user-1",
      name: "Updated Name",
      email: "updated@test.com",
      emailVerified: true,
      image: "https://example.com/avatar.png",
      createdAt: updatedAt - 1000,
      updatedAt,
    });

    const user = await t.query(api.authSync.getUserByAuthId, {
      authId: "ba-user-1",
    });

    expect(resultId).toBe(existingId);
    expect(user!.fullName).toBe("Updated Name");
    expect(user!.email).toBe("updated@test.com");
    expect(user!.emailVerified).toBe(true);
    expect(user!.image).toBe("https://example.com/avatar.png");
    expect(user!.username).toBe("oldname");
  });

  it("[BR03] AUTH-003: Soft deletes user", async () => {
    const t = convexTest(schema, modules);

    await seedUser(t, { authId: "ba-user-delete" });

    await t.mutation(api.authSync.deleteUser, { authId: "ba-user-delete" });

    const user = await t.query(api.authSync.getUserByAuthId, {
      authId: "ba-user-delete",
    });

    expect(user).not.toBeNull();
    expect(user!.isDeleted).toBe(true);
    expect(user!.deletedAt).toBeDefined();
  });
});

// ─── UC02: Organization Sync ────────────────────────────────────────────────

describe("UC02: Organization Sync", () => {
  it("[BR04] AUTH-004: Creates org and default branch", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.mutation(api.authSync.syncOrganization, {
      authId: "ba-org-new",
      name: "New Org",
      slug: "new-org",
      logo: undefined,
      metadata: undefined,
      createdAt: Date.now(),
    });

    const org = await t.query(api.authSync.getOrganizationByAuthId, {
      authId: "ba-org-new",
    });

    const branches = await t.run(async (ctx) => {
      return await ctx.db
        .query("branches")
        .withIndex("organizationId", (q) => q.eq("organizationId", orgId))
        .collect();
    });

    expect(orgId).toBeDefined();
    expect(org).not.toBeNull();
    expect(org!.name).toBe("New Org");
    expect(org!.slug).toBe("new-org");
    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe("Main Warehouse");
  });
});

// ─── UC03: Member Sync ──────────────────────────────────────────────────────

describe("UC03: Member Sync", () => {
  it("[BR05] AUTH-005: Returns null when org missing", async () => {
    const t = convexTest(schema, modules);

    await seedUser(t, { authId: "ba-user-member" });

    const memberId = await t.mutation(api.authSync.syncMember, {
      userAuthId: "ba-user-member",
      organizationAuthId: "ba-org-missing",
    });

    expect(memberId).toBeNull();
  });

  it("[BR06] AUTH-006: Creates member when user and org exist", async () => {
    const t = convexTest(schema, modules);

    const userId = await seedUser(t, { authId: "ba-user-member-2" });
    const orgId = await seedOrganization(t, { authId: "ba-org-2" });

    const memberId = await t.mutation(api.authSync.syncMember, {
      userAuthId: "ba-user-member-2",
      organizationAuthId: "ba-org-2",
    });

    const member = await t.run(async (ctx) => {
      return await ctx.db.get(memberId!);
    });

    expect(memberId).toBeDefined();
    expect(member).not.toBeNull();
    expect(member!.userId).toBe(userId);
    expect(member!.organizationId).toBe(orgId);
  });
});
