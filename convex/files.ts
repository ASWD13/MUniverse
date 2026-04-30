import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const storeFile = mutation({
    args: {
        url: v.string(),
        userId: v.string(),
        name: v.optional(v.string()),
        size: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("files", {
            url: args.url,
            clerkId: args.userId,
            name: args.name ?? null,
            size: args.size ?? null,
            uploadedAt: Date.now(),
        });

        return { success: true };
    },
});
