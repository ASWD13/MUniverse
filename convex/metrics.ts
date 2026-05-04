import { httpAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Aggregate performance metrics for the health endpoint.
 */
export const getHealthMetrics = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Active sessions (last 30 mins)
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiresAt", (q) => q.gt("expiresAt", now))
      .collect();

    // 2. Search performance
    const searchLogs = await ctx.db.query("searchQueryLogs").collect();
    const totalSearchLatency = searchLogs.reduce((sum, log) => sum + log.latencyMs, 0);
    const avgSearchLatency = searchLogs.length > 0 ? totalSearchLatency / searchLogs.length : 0;
    const searchErrors = searchLogs.filter(l => l.status === "error").length;
    const searchErrorRate = searchLogs.length > 0 ? (searchErrors / searchLogs.length) * 100 : 0;

    // 3. Resource access performance
    const resourceLogs = await ctx.db.query("resourceAccessLogs").collect();
    const logsWithLatency = resourceLogs.filter(l => l.latencyMs !== undefined);
    const totalResourceLatency = logsWithLatency.reduce((sum, log) => sum + (log.latencyMs ?? 0), 0);
    const avgResourceLatency = logsWithLatency.length > 0 ? totalResourceLatency / logsWithLatency.length : 0;

    return {
      status: "healthy",
      timestamp: now,
      metrics: {
        active_sessions: activeSessions.length,
        avg_search_latency_ms: Math.round(avgSearchLatency),
        avg_resource_latency_ms: Math.round(avgResourceLatency),
        search_error_rate_percent: parseFloat(searchErrorRate.toFixed(2)),
        total_requests_tracked: searchLogs.length + resourceLogs.length,
      }
    };
  },
});

/**
 * HTTP Action to expose metrics at /health
 */
export const health = httpAction(async (ctx, request) => {
  const metrics = await ctx.runQuery(internal.metrics.getHealthMetrics, {});

  return new Response(JSON.stringify(metrics), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
});
