import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthContext = QueryCtx | MutationCtx;

export async function requireUser(ctx: AuthContext): Promise<Doc<"users">> {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
        throw new Error("Unauthorized");
    }

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}
