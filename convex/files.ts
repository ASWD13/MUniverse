import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

async function upsertFileRecord(
    ctx: Parameters<typeof mutation>[0] extends never ? never : any,
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
        .withIndex("by_url", (q: any) => q.eq("url", args.url))
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
