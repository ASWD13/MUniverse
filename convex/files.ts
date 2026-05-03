import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

async function upsertFileRecord(
    ctx: MutationCtx,
    args: {
        fileKey?: string;
        url: string;
        clerkId: string;
        name?: string;
        size?: number;
    },
) {
    const existingByUrl = await ctx.db
        .query("files")
                .withIndex("by_url", (q) => q.eq("url", args.url))
        .unique();

    if (existingByUrl) {
        await ctx.db.patch(existingByUrl._id, {
            fileKey: args.fileKey ?? existingByUrl.fileKey,
            clerkId: args.clerkId,
            name: args.name ?? existingByUrl.name,
            size: args.size ?? existingByUrl.size,
            uploadedAt: Date.now(),
        });

        return { success: true, id: existingByUrl._id, duplicate: true };
    }

    const insertedId = await ctx.db.insert("files", {
        fileKey: args.fileKey ?? undefined,
        url: args.url,
        clerkId: args.clerkId,
        name: args.name ?? undefined,
        size: args.size ?? undefined,
        uploadedAt: Date.now(),
    });

    return { success: true, id: insertedId, duplicate: false };
}

export const storeFileForCurrentUser = mutation({
    args: {
        fileKey: v.optional(v.string()),
        url: v.string(),
        name: v.optional(v.string()),
        size: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        return upsertFileRecord(ctx, {
            fileKey: args.fileKey,
            url: args.url,
            clerkId: identity.subject,
            name: args.name,
            size: args.size,
        });
    },
});

export const storeFileFromUploadthing = internalMutation({
    args: {
        fileKey: v.optional(v.string()),
        url: v.string(),
        clerkId: v.string(),
        name: v.optional(v.string()),
        size: v.optional(v.number()),
    },
    handler: async (ctx, args) =>
        upsertFileRecord(ctx, {
            fileKey: args.fileKey,
            url: args.url,
            clerkId: args.clerkId,
            name: args.name,
            size: args.size,
        }),
});

export const getCurrentUserFiles = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const rows = await ctx.db
            .query("files")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .collect();

        return rows.map((r) => ({
            _id: r._id,
            fileKey: r.fileKey ?? undefined,
            url: r.url,
            clerkId: r.clerkId,
            name: r.name ?? undefined,
            size: r.size ?? undefined,
            uploadedAt: r.uploadedAt ?? undefined,
        }));
    },
});

export const logResourceAccess = mutation({
    args: {
        fileId: v.optional(v.id("files")),
        url: v.optional(v.string()),
        fileName: v.optional(v.string()),
        accessType: v.union(v.literal("view"), v.literal("download")),
        userAgent: v.optional(v.string()),
        referrer: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        let file = args.fileId ? await ctx.db.get(args.fileId) : null;
        if (!file && args.url) {
            file = await ctx.db
                .query("files")
                .withIndex("by_url", (q) => q.eq("url", args.url as string))
                .first();
        }

        if (!file && !args.url && !args.fileName) {
            throw new Error("fileId, url, or fileName is required");
        }

        const id = await ctx.db.insert("resourceAccessLogs", {
            fileId: file?._id,
            url: file?.url ?? args.url,
            fileName: file?.name ?? args.fileName,
            userId: user._id,
            clerkId: user.clerkId,
            accessType: args.accessType,
            accessedAt: Date.now(),
            userAgent: args.userAgent,
            referrer: args.referrer,
        });

        return { success: true, id };
    },
});

export const getResourceAccessStats = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx);
        requireRole(user, ["admin"]);

        const [files, logs] = await Promise.all([
            ctx.db.query("files").collect(),
            ctx.db.query("resourceAccessLogs").collect(),
        ]);

        const fileById = new Map(files.map((file) => [file._id, file]));
        const statsByResource = new Map<
            string,
            {
                fileId?: string;
                url?: string;
                fileName: string;
                views: number;
                downloads: number;
                total: number;
                lastAccessedAt: number | null;
            }
        >();

        for (const log of logs) {
            const file = log.fileId ? fileById.get(log.fileId) : null;
            const key = log.fileId ?? log.url ?? "unknown-resource";
            const existing = statsByResource.get(key) ?? {
                fileId: log.fileId,
                url: file?.url ?? log.url,
                fileName: file?.name ?? log.fileName ?? file?.url ?? log.url ?? "Unknown resource",
                views: 0,
                downloads: 0,
                total: 0,
                lastAccessedAt: null,
            };

            if (log.accessType === "download") {
                existing.downloads += 1;
            } else {
                existing.views += 1;
            }
            existing.total += 1;
            existing.lastAccessedAt = Math.max(existing.lastAccessedAt ?? 0, log.accessedAt);
            statsByResource.set(key, existing);
        }

        return {
            totalAccesses: logs.length,
            totalViews: logs.filter((log) => log.accessType === "view").length,
            totalDownloads: logs.filter((log) => log.accessType === "download").length,
            uniqueResourcesAccessed: statsByResource.size,
            perResource: Array.from(statsByResource.values()).sort((left, right) => {
                if (right.total !== left.total) return right.total - left.total;
                return (right.lastAccessedAt ?? 0) - (left.lastAccessedAt ?? 0);
            }),
        };
    },
});
