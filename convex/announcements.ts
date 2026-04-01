import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import type { AppRole } from "./lib/rbac";
import { normalizeTargetRoles, requireRole } from "./lib/rbac";

const roleValue = v.union(
    v.literal("student"),
    v.literal("faculty"),
    v.literal("admin"),
);

function requireNonEmptyTrimmed(value: string, fieldName: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error(`${fieldName} must not be empty`);
    }
    return trimmed;
}

type CreateAnnouncementArgs = {
    title: string;
    content: string;
    targetRoles: AppRole[];
};

type MarkAnnouncementReadArgs = {
    announcementId: Id<"announcements">;
};

type DeleteAnnouncementArgs = {
    announcementId: Id<"announcements">;
};

async function canonicalizeAnnouncementReads(
    ctx: MutationCtx,
    userId: Id<"users">,
    announcementId: Id<"announcements">,
): Promise<Id<"announcementReads"> | null> {
    const reads = await ctx.db
        .query("announcementReads")
        .withIndex("by_user_announcement", (q) =>
            q.eq("userId", userId).eq("announcementId", announcementId),
        )
        .collect();

    if (reads.length === 0) {
        return null;
    }

    const canonicalRead = reads[0];
    const duplicateReads = reads.slice(1);

    if (duplicateReads.length > 0) {
        await Promise.allSettled(
            duplicateReads.map((duplicateRead) => ctx.db.delete(duplicateRead._id)),
        );
    }

    return canonicalRead._id;
}

export async function createAnnouncementHandler(
    ctx: MutationCtx,
    args: CreateAnnouncementArgs,
) {
    const user = await requireUser(ctx);
    requireRole(user, ["admin", "faculty"]);

    const title = requireNonEmptyTrimmed(args.title, "title");
    const content = requireNonEmptyTrimmed(args.content, "content");
    const targetRoles = normalizeTargetRoles(args.targetRoles);

    const announcementId = await ctx.db.insert("announcements", {
        title,
        content,
        authorId: user._id,
        targetRoles,
        updatedAt: Date.now(),
    });

    const users = await ctx.db.query("users").collect();
    const recipients = users.filter(
        (candidate) =>
            candidate._id !== user._id && targetRoles.includes(candidate.role),
    );

    await Promise.all(
        recipients.map((recipient) =>
            ctx.db.insert("notifications", {
                userId: recipient._id,
                type: "announcement",
                content: `New announcement: ${title}`,
                isRead: false,
                relatedId: announcementId,
            }),
        ),
    );

    return announcementId;
}

export async function getAnnouncementsHandler(ctx: QueryCtx) {
    const user = await requireUser(ctx);

    const announcements = await ctx.db
        .query("announcements")
        .withIndex("by_updatedAt")
        .order("desc")
        .collect();

    const reads = await ctx.db
        .query("announcementReads")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

    const readAtByAnnouncementId = new Map<Id<"announcements">, number>();
    for (const read of reads) {
        readAtByAnnouncementId.set(read.announcementId, read.readAt);
    }

    return announcements
        .filter((announcement) => announcement.targetRoles.includes(user.role))
        .map((announcement) => ({
            ...announcement,
            isRead: readAtByAnnouncementId.has(announcement._id),
            readAt: readAtByAnnouncementId.get(announcement._id) ?? null,
        }));
}

export async function markAnnouncementReadHandler(
    ctx: MutationCtx,
    args: MarkAnnouncementReadArgs,
) {
    const user = await requireUser(ctx);

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
        throw new Error("Announcement not found");
    }

    if (!announcement.targetRoles.includes(user.role)) {
        throw new Error("Forbidden");
    }

    const existingReadId = await canonicalizeAnnouncementReads(
        ctx,
        user._id,
        args.announcementId,
    );

    if (existingReadId) {
        return existingReadId;
    }

    await ctx.db.insert("announcementReads", {
        userId: user._id,
        announcementId: args.announcementId,
        readAt: Date.now(),
    });

    const canonicalReadId = await canonicalizeAnnouncementReads(
        ctx,
        user._id,
        args.announcementId,
    );

    if (!canonicalReadId) {
        throw new Error("Failed to mark announcement as read");
    }

    return canonicalReadId;
}

export async function deleteAnnouncementHandler(
    ctx: MutationCtx,
    args: DeleteAnnouncementArgs,
) {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
        throw new Error("Announcement not found");
    }

    const readDocs = await ctx.db
        .query("announcementReads")
        .withIndex("by_announcement", (q) =>
            q.eq("announcementId", args.announcementId),
        )
        .collect();

    for (const readDoc of readDocs) {
        await ctx.db.delete(readDoc._id);
    }

    const announcementNotifications = (
        await ctx.db
            .query("notifications")
            .withIndex("by_type", (q) => q.eq("type", "announcement"))
            .collect()
    ).filter((notification) => notification.relatedId === args.announcementId);

    for (const notification of announcementNotifications) {
        await ctx.db.delete(notification._id);
    }

    await ctx.db.delete(args.announcementId);

    return { success: true };
}

export const createAnnouncement = mutation({
    args: {
        title: v.string(),
        content: v.string(),
        targetRoles: v.array(roleValue),
    },
    handler: createAnnouncementHandler,
});

export const getAnnouncements = query({
    args: {},
    handler: getAnnouncementsHandler,
});

export const markAnnouncementRead = mutation({
    args: {
        announcementId: v.id("announcements"),
    },
    handler: markAnnouncementReadHandler,
});

export const deleteAnnouncement = mutation({
    args: {
        announcementId: v.id("announcements"),
    },
    handler: deleteAnnouncementHandler,
});
