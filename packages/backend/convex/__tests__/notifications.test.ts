/**
 * MODULE 10: Notifications — Unit Tests
 * UC55–UC56 | BR187–BR191
 *
 * Tests based on Business Rules from testcase_instruction.md:
 *   NOTIF-001 to NOTIF-007
 *
 * Source: packages/backend/convex/notifications.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import {
  seedOrganization,
  seedSystemLookup,
  seedUser,
} from "./helpers/seed";

const modules = import.meta.glob("../**/*.ts");

async function seedNotificationLookups(t: ReturnType<typeof convexTest>) {
  const infoCategoryId = await seedSystemLookup(
    t,
    "NotificationCategory",
    "INFO",
    "Info",
    1,
  );
  const highPriorityId = await seedSystemLookup(
    t,
    "Priority",
    "HIGH",
    "High",
    1,
  );

  return { infoCategoryId, highPriorityId };
}

async function createTestNotification(
  t: ReturnType<typeof convexTest>,
  args: {
    organizationId: string;
    userId: string;
    categoryId: string;
    priorityId: string;
    title: string;
  },
) {
  await t.mutation(api.notifications.create, {
    organizationId: args.organizationId as unknown as string,
    notificationCategoryTypeId: args.categoryId as unknown as string,
    notificationType: "TEST",
    recipientUserId: args.userId as unknown as string,
    title: args.title,
    message: `Message for ${args.title}`,
    priorityTypeId: args.priorityId as unknown as string,
  });
}

// ─── UC55: View Notifications ──────────────────────────────────────────────

describe("UC55: View Notifications", () => {
  it("[BR187] NOTIF-001: List returns max 10 notifications", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const userId = await seedUser(t);
    const lookups = await seedNotificationLookups(t);

    for (let i = 0; i < 12; i += 1) {
      await createTestNotification(t, {
        organizationId: orgId as unknown as string,
        userId: userId as unknown as string,
        categoryId: lookups.infoCategoryId as unknown as string,
        priorityId: lookups.highPriorityId as unknown as string,
        title: `Notif ${i}`,
      });
    }

    const list = await t.query(api.notifications.listDetailed, {
      userId,
      organizationId: orgId,
    });

    expect(list).toHaveLength(10);
    expect(list[0].title).toBe("Notif 11");
  });

  it("[BR188] NOTIF-002: Detailed list includes category and priority", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const userId = await seedUser(t);
    const lookups = await seedNotificationLookups(t);

    await createTestNotification(t, {
      organizationId: orgId as unknown as string,
      userId: userId as unknown as string,
      categoryId: lookups.infoCategoryId as unknown as string,
      priorityId: lookups.highPriorityId as unknown as string,
      title: "Notif Detailed",
    });

    const list = await t.query(api.notifications.listDetailed, {
      userId,
      organizationId: orgId,
    });

    expect(list).toHaveLength(1);
    expect(list[0].category?.lookupCode).toBe("INFO");
    expect(list[0].priority?.lookupCode).toBe("HIGH");
  });

  it("[BR189] NOTIF-003: Missing user/org returns empty list", async () => {
    const t = convexTest(schema, modules);

    const list = await t.query(api.notifications.listDetailed, {
      userId: undefined,
      organizationId: undefined,
    });

    expect(list).toHaveLength(0);
  });
});

// ─── UC56: Mark Notification as Read ───────────────────────────────────────

describe("UC56: Mark Notification as Read", () => {
  it("[BR190] NOTIF-005: Mark as read sets readAt", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const userId = await seedUser(t);
    const lookups = await seedNotificationLookups(t);

    await createTestNotification(t, {
      organizationId: orgId as unknown as string,
      userId: userId as unknown as string,
      categoryId: lookups.infoCategoryId as unknown as string,
      priorityId: lookups.highPriorityId as unknown as string,
      title: "Notif Read",
    });

    const [notification] = await t.query(api.notifications.list, {
      userId,
    });

    await t.mutation(api.notifications.markAsRead, {
      notificationId: notification._id,
    });

    const updated = await t.run(async (ctx) => ctx.db.get(notification._id));
    expect(updated!.readAt).toBeDefined();
  });

  it("[BR191] NOTIF-007: Unread list excludes read items", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const userId = await seedUser(t);
    const lookups = await seedNotificationLookups(t);

    await createTestNotification(t, {
      organizationId: orgId as unknown as string,
      userId: userId as unknown as string,
      categoryId: lookups.infoCategoryId as unknown as string,
      priorityId: lookups.highPriorityId as unknown as string,
      title: "Notif Unread",
    });

    await createTestNotification(t, {
      organizationId: orgId as unknown as string,
      userId: userId as unknown as string,
      categoryId: lookups.infoCategoryId as unknown as string,
      priorityId: lookups.highPriorityId as unknown as string,
      title: "Notif Read",
    });

    const list = await t.query(api.notifications.list, { userId });
    const readId = list.find((n) => n.title === "Notif Read")!._id;

    await t.mutation(api.notifications.markAsRead, {
      notificationId: readId,
    });

    const unread = await t.query(api.notifications.list, {
      userId,
      unreadOnly: true,
    });

    expect(unread).toHaveLength(1);
    expect(unread[0].title).toBe("Notif Unread");
  });
});
