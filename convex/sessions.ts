import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Internal helper to refresh or create a session.
 */
export async function refreshSessionInternal(
  ctx: MutationCtx,
  userId: Id<"users">,
  clerkId: string,
  userAgent?: string
) {
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  const existing = await ctx.db
    .query("sessions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      lastActiveAt: now,
      expiresAt,
      userAgent: userAgent ?? existing.userAgent,
    });
    return existing._id;
  }

  return await ctx.db.insert("sessions", {
    userId,
    clerkId,
    userAgent,
    lastActiveAt: now,
    expiresAt,
  });
}

/**
 * Refresh or create a session for the current user.
 */
export const refreshSession = mutation({
  args: {
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await refreshSessionInternal(ctx, user._id, user.clerkId, args.userAgent);
  },
});

/**
 * Internal query to count active sessions.
 */
export const getActiveSessionsCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiresAt", (q) => q.gt("expiresAt", now))
      .collect();

    return activeSessions.length;
  },
});
