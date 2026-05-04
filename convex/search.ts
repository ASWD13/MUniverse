import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";
import { refreshSessionInternal } from "./sessions";

export const logSearchQuery = mutation({
  args: {
    query: v.string(),
    surface: v.string(),
    latencyMs: v.number(),
    resultCount: v.optional(v.number()),
    status: v.optional(v.union(v.literal("success"), v.literal("error"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const normalizedQuery = args.query.trim().toLowerCase();

    if (!normalizedQuery) {
      return { success: false, skipped: true };
    }

    const id = await ctx.db.insert("searchQueryLogs", {
      query: args.query,
      normalizedQuery,
      surface: args.surface,
      latencyMs: Math.max(0, args.latencyMs),
      resultCount: args.resultCount,
      status: args.status ?? "success",
      userId: user._id,
      clerkId: user.clerkId,
      searchedAt: Date.now(),
    });

    await refreshSessionInternal(ctx, user._id, user.clerkId);

    return { success: true, id };
  },
});

export const getSearchPerformanceStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const logs = await ctx.db.query("searchQueryLogs").collect();
    const successfulLogs = logs.filter((log) => log.status === "success");
    const totalLatency = successfulLogs.reduce((sum, log) => sum + log.latencyMs, 0);
    const averageLatencyMs =
      successfulLogs.length > 0 ? Math.round(totalLatency / successfulLogs.length) : 0;

    const queryMap = new Map<
      string,
      {
        query: string;
        count: number;
        averageLatencyMs: number;
        lastSearchedAt: number;
      }
    >();

    for (const log of successfulLogs) {
      const existing = queryMap.get(log.normalizedQuery) ?? {
        query: log.query,
        count: 0,
        averageLatencyMs: 0,
        lastSearchedAt: 0,
      };
      const nextCount = existing.count + 1;
      existing.averageLatencyMs = Math.round(
        (existing.averageLatencyMs * existing.count + log.latencyMs) / nextCount,
      );
      existing.count = nextCount;
      existing.lastSearchedAt = Math.max(existing.lastSearchedAt, log.searchedAt);
      queryMap.set(log.normalizedQuery, existing);
    }

    return {
      totalQueries: logs.length,
      successfulQueries: successfulLogs.length,
      failedQueries: logs.length - successfulLogs.length,
      averageLatencyMs,
      slowestLatencyMs: logs.reduce((max, log) => Math.max(max, log.latencyMs), 0),
      topQueries: Array.from(queryMap.values())
        .sort((left, right) => {
          if (right.count !== left.count) return right.count - left.count;
          return right.lastSearchedAt - left.lastSearchedAt;
        })
        .slice(0, 10),
      recentQueries: [...logs]
        .sort((left, right) => right.searchedAt - left.searchedAt)
        .slice(0, 10)
        .map((log) => ({
          query: log.query,
          surface: log.surface,
          latencyMs: log.latencyMs,
          resultCount: log.resultCount,
          status: log.status,
          searchedAt: log.searchedAt,
        })),
    };
  },
});
