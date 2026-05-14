/**
 * MODULE 2: Organization — Unit Tests
 * UC04–UC10 | BR18–BR45
 *
 * Tests based on Business Rules from testcase_instruction.md:
 *   ORG-001, ORG-004, ORG-012, ORG-019, ORG-021, ORG-016, ORG-018, ORG-030
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

// ─── UC04: Login to Organization ────────────────────────────────────────────

describe("UC04: Login to Organization", () => {
  it("[BR18] ORG-001: Returns memberships for a user", async () => {
    const t = convexTest(schema, modules);

    const userId = await seedUser(t, { authId: "ba-user-org-1" });
    const orgId = await seedOrganization(t, { authId: "ba-org-1" });

    await t.run(async (ctx) => {
      await ctx.db.insert("members", {
        userId,
        organizationId: orgId,
        userAuthId: "ba-user-org-1",
        organizationAuthId: "ba-org-1",
      });
    });

    const memberships = await t.query(api.authSync.getUserMemberships, {
      userId,
    });

    expect(memberships).toHaveLength(1);
    expect(memberships[0].organizationId).toBe(orgId);
  });

  it("[BR21] ORG-004: Fetches organization by slug", async () => {
    const t = convexTest(schema, modules);

    await seedOrganization(t, {
      authId: "ba-org-2",
      slug: "org-slug-2",
      name: "Org Two",
    });

    const org = await t.query(api.authSync.getOrganizationBySlug, {
      slug: "org-slug-2",
    });

    expect(org).not.toBeNull();
    expect(org!.name).toBe("Org Two");
  });
});

// ─── UC06: Create Organization ──────────────────────────────────────────────

describe("UC06: Create Organization", () => {
  it("[BR30] ORG-012: syncOrganization creates org with default branch", async () => {
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
    expect(org!.slug).toBe("new-org");
    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe("Main Warehouse");
  });
});

// ─── UC08: Edit Organization ────────────────────────────────────────────────

describe("UC08: Edit Organization", () => {
  it("[BR37] ORG-019: Rejects update for missing org", async () => {
    const t = convexTest(schema, modules);

    const orgId = await seedOrganization(t, {
      name: "Temp Org",
      slug: "temp-org",
      authId: "ba-org-temp",
    });

    await t.run(async (ctx) => {
      await ctx.db.delete(orgId);
    });

    await expect(
      t.mutation(api.authSync.updateOrganization, {
        id: orgId,
        name: "No Org",
      }),
    ).rejects.toThrow("Organization not found");
  });

  it("[BR38] ORG-021: Updates organization fields", async () => {
    const t = convexTest(schema, modules);

    const orgId = await seedOrganization(t, {
      name: "Old Org",
      address: "Old Address",
    });

    await t.mutation(api.authSync.updateOrganization, {
      id: orgId,
      name: "Updated Org",
      address: "New Address",
      logo: "https://example.com/logo.png",
      contactInfo: { phone: "0123" },
    });

    const org = await t.query(api.authSync.getOrganizationById, {
      organizationId: orgId,
    });

    expect(org!.name).toBe("Updated Org");
    expect(org!.address).toBe("New Address");
    expect(org!.logo).toBe("https://example.com/logo.png");
    expect(org!.contactInfo).toEqual({ phone: "0123" });
  });
});

// ─── UC07: Invite Member ────────────────────────────────────────────────────

describe("UC07: Invite Member", () => {
  it("[BR34] ORG-016: Returns null when user not found", async () => {
    const t = convexTest(schema, modules);

    await seedOrganization(t, { authId: "ba-org-invite" });

    const result = await t.mutation(api.authSync.syncMember, {
      userAuthId: "ba-user-missing",
      organizationAuthId: "ba-org-invite",
    });

    expect(result).toBeNull();
  });

  it("[BR36] ORG-018: Creates member when user and org exist", async () => {
    const t = convexTest(schema, modules);

    const userId = await seedUser(t, { authId: "ba-user-invite" });
    const orgId = await seedOrganization(t, { authId: "ba-org-invite-2" });

    const memberId = await t.mutation(api.authSync.syncMember, {
      userAuthId: "ba-user-invite",
      organizationAuthId: "ba-org-invite-2",
    });

    const member = await t.run(async (ctx) => {
      return await ctx.db.get(memberId!);
    });

    expect(memberId).toBeDefined();
    expect(member!.userId).toBe(userId);
    expect(member!.organizationId).toBe(orgId);
  });
});

// ─── UC10: Edit Role Permissions (member removal path) ──────────────────────

describe("UC10: Organization Membership Cleanup", () => {
  it("[BR45] ORG-030: deleteMember removes membership", async () => {
    const t = convexTest(schema, modules);

    await seedUser(t, { authId: "ba-user-remove" });
    await seedOrganization(t, { authId: "ba-org-remove" });

    const memberId = await t.mutation(api.authSync.syncMember, {
      userAuthId: "ba-user-remove",
      organizationAuthId: "ba-org-remove",
    });

    expect(memberId).toBeDefined();

    const deletedId = await t.mutation(api.authSync.deleteMember, {
      userAuthId: "ba-user-remove",
      organizationAuthId: "ba-org-remove",
    });

    const member = await t.run(async (ctx) => {
      return await ctx.db.get(memberId!);
    });

    expect(deletedId).toBe(memberId);
    expect(member).toBeNull();
  });
});
