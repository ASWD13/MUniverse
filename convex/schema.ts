import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),

        firstName: v.union(v.string(), v.null()),
        lastName: v.union(v.string(), v.null()),
        email: v.union(v.string(), v.null()),

        role: v.union(
            v.literal("student"),
            v.literal("faculty"),
            v.literal("admin")
        ),

        department: v.optional(v.string()),
        enrollmentNumber: v.optional(v.string()),
        employeeId: v.optional(v.string()),

        updatedAt: v.optional(v.number()),
    }).index("by_clerk_id", ["clerkId"])
        .index("by_email", ["email"])
        .index("by_department", ["department"])
        .index("by_enrollmentNumber", ["enrollmentNumber"])
        .index("by_employeeId", ["employeeId"]),

    announcements: defineTable({
        title: v.string(),
        content: v.string(),
        authorId: v.id("users"),
        targetRoles: v.array(
            v.union(
                v.literal("student"),
                v.literal("faculty"),
                v.literal("admin")
            )
        ),
        updatedAt: v.number(),
    })
        .index("by_authorId", ["authorId"])
        .index("by_updatedAt", ["updatedAt"]),

    notifications: defineTable({
        userId: v.id("users"),
        type: v.union(
            v.literal("general"),
            v.literal("announcement"),
            v.literal("event")
        ),
        content: v.string(),
        isRead: v.boolean(),
        relatedId: v.optional(v.id("announcements")),
    })
        .index("by_userId", ["userId"])
        .index("by_type", ["type"])
        .index("by_user_unread", ["userId", "isRead"]),

    announcementReads: defineTable({
        userId: v.id("users"),
        announcementId: v.id("announcements"),
        readAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_announcement", ["announcementId"])
        .index("by_user_announcement", ["userId", "announcementId"]),
});
