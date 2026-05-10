import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";

/**
 * Internal helper to create a notification.
 * Can be called from other mutations/actions.
 */
export async function createNotification(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    notificationCategoryTypeId: Id<"system_lookups">;
    notificationType: string;
    recipientUserId: Id<"users">;
    title: string;
    message: string;
    priorityTypeId: Id<"system_lookups">;
    actionUrl?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  },
) {
  await ctx.db.insert("notifications", {
    organizationId: args.organizationId,
    notificationCategoryTypeId: args.notificationCategoryTypeId,
    notificationType: args.notificationType,
    recipientUserId: args.recipientUserId,
    title: args.title,
    message: args.message,
    priorityTypeId: args.priorityTypeId,
    actionUrl: args.actionUrl,
    relatedEntityType: args.relatedEntityType,
    relatedEntityId: args.relatedEntityId,
    // readAt and dismissedAt are undefined initially
  });
}

/**
 * Public mutation to create a notification.
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    notificationCategoryTypeId: v.id("system_lookups"),
    notificationType: v.string(),
    recipientUserId: v.id("users"),
    title: v.string(),
    message: v.string(),
    priorityTypeId: v.id("system_lookups"),
    actionUrl: v.optional(v.string()),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await createNotification(ctx, args);
  },
});

/**
 * Get notifications for a user.
 * Returns list sorted by creation time (newest first).
 */
export const list = query({
  args: {
    userId: v.id("users"),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("recipientUserId", (q) => q.eq("recipientUserId", args.userId))
      .order("desc") // Newest first
      .collect();

    if (args.unreadOnly) {
      return notifications.filter((n) => !n.readAt);
    }

    return notifications;
  },
});

export const listDetailed = query({
  args: {
    userId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    unreadOnly: v.optional(v.boolean()),
    // Add topK parameter with a default value of 10
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Early return if required args are missing
    if (!args.userId || !args.organizationId) {
      return [];
    }

    const limit = args.limit ?? 10;

    // Use .take(limit) instead of .collect() or .paginate()
    // TypeScript: userId and organizationId are guaranteed to be defined here
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("recipientUserId", (q) => q.eq("recipientUserId", args.userId!))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId!))
      .order("desc")
      .take(limit);

    // Apply filtering if unreadOnly is requested
    const filteredNotifications = args.unreadOnly
      ? notifications.filter((n) => !n.readAt)
      : notifications;

    // Join the related category and priority documents
    return await Promise.all(
      filteredNotifications.map(async (n) => {
        const [category, priority] = await Promise.all([
          ctx.db.get(n.notificationCategoryTypeId),
          ctx.db.get(n.priorityTypeId),
        ]);

        return {
          ...n,
          category,
          priority,
        };
      })
    );
  },
});

/**
 * Mark a notification as read.
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      readAt: Date.now(),
    });
  },
});
