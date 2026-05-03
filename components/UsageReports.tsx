"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import MainLayout from "./MainLayout";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

function MetricTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/3 p-6 text-center">
      <p className="text-sm font-semibold text-zinc-500">{title}</p>
    </div>
  );
}

export default function UsageReports() {
  const report = useQuery(api.reports.getUsageReport);
  const resourceAccessStats = useQuery(api.files.getResourceAccessStats);
  const searchStats = useQuery(api.search.getSearchPerformanceStats);

  const isLoading =
    report === undefined || resourceAccessStats === undefined || searchStats === undefined;

  return (
    <MainLayout roleLabel="Admin">
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Usage Reports</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            System Overview
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Live snapshot of portal activity across users, announcements, resources, and academic
            data.
          </p>
          {report ? (
            <p className="mt-3 text-xs text-zinc-500">
              Generated at {formatDate(report.generatedAt)}
            </p>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Total Users" value={isLoading ? "..." : (report?.users.total ?? 0)} />
          <StatCard
            label="Announcements"
            value={isLoading ? "..." : (report?.announcements.total ?? 0)}
          />
          <StatCard label="Files Uploaded" value={isLoading ? "..." : (report?.files.total ?? 0)} />
          <StatCard
            label="Storage Used"
            value={isLoading ? "..." : formatBytes(report?.files.totalStorageBytes ?? 0)}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">User Analytics</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                Registered Users
              </h2>
              <p className="mt-2 text-sm text-zinc-300">
                Role and department breakdown of all users in the system.
              </p>
            </header>

            {!report ? (
              <p className="mt-5 text-sm text-zinc-400">Loading...</p>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Students", value: report.users.students },
                    { label: "Faculty", value: report.users.faculty },
                    { label: "Admins", value: report.users.admins },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-white/15 bg-white/5 p-3 text-center"
                    >
                      <p className="text-xs uppercase tracking-[0.08em] text-zinc-400">
                        {item.label}
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {report.users.departmentBreakdown.length > 0 ? (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="section-kicker mb-3">By Department</p>
                    <ul className="space-y-2">
                      {report.users.departmentBreakdown.map(({ dept, count }) => (
                        <li
                          key={dept}
                          className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-2.5"
                        >
                          <p className="text-sm uppercase tracking-[0.06em] text-zinc-300">
                            {dept}
                          </p>
                          <p className="text-sm font-semibold text-white">{count}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-zinc-500">No department data yet.</p>
                )}
              </>
            )}
          </article>

          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Communication Analytics</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                Announcement Reads
              </h2>
              <p className="mt-2 text-sm text-zinc-300">
                Read/unread breakdown, role targeting, and per-announcement counts.
              </p>
            </header>

            {!report ? (
              <p className="mt-5 text-sm text-zinc-400">Loading...</p>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Total", value: report.announcements.total },
                    { label: "Reads", value: report.announcements.totalReads },
                    { label: "Unread", value: report.announcements.totalUnread },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-white/15 bg-white/5 p-3 text-center"
                    >
                      <p className="text-xs uppercase tracking-[0.08em] text-zinc-400">
                        {item.label}
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="section-kicker mb-3">Announcements Targeting Each Role</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(report.announcements.roleTargetBreakdown).map(([role, count]) => (
                      <span
                        key={role}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-zinc-200"
                      >
                        {role}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                {report.announcements.perAnnouncement.length > 0 ? (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="section-kicker mb-3">Per-Announcement Reads</p>
                    <ul className="space-y-2">
                      {report.announcements.perAnnouncement.map((announcement) => (
                        <li
                          key={announcement._id}
                          className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-zinc-200">{announcement.title}</p>
                            <p className="text-xs text-zinc-500">
                              {formatDate(announcement.updatedAt)}
                            </p>
                          </div>
                          <span className="ml-3 flex-shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                            {announcement.readCount} reads
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </article>
        </section>

        <section className="surface-card p-5 md:p-6">
          <header>
            <p className="section-kicker">Academic Analytics</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              Courses, Enrollments &amp; Grades
            </h2>
          </header>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <MetricTile
              label="Courses"
              value={isLoading ? "..." : (report?.academic.totalCourses ?? 0)}
            />
            <MetricTile
              label="Enrollments"
              value={isLoading ? "..." : (report?.academic.totalEnrollments ?? 0)}
            />
            <MetricTile
              label="Assignments"
              value={isLoading ? "..." : (report?.academic.totalAssignments ?? 0)}
            />
            <MetricTile
              label="Grades Posted"
              value={isLoading ? "..." : (report?.academic.totalGrades ?? 0)}
            />
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="section-kicker mb-3">Resource Access Stats</p>
            {!resourceAccessStats ? (
              <p className="text-sm text-zinc-400">Loading resource access stats...</p>
            ) : resourceAccessStats.totalAccesses === 0 ? (
              <EmptyState title="No resource views or downloads logged yet." />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <MetricTile label="Total Accesses" value={resourceAccessStats.totalAccesses} />
                  <MetricTile label="Views" value={resourceAccessStats.totalViews} />
                  <MetricTile label="Downloads" value={resourceAccessStats.totalDownloads} />
                  <MetricTile label="Resources" value={resourceAccessStats.uniqueResourcesAccessed} />
                </div>
                <ul className="mt-4 space-y-2">
                  {resourceAccessStats.perResource.slice(0, 8).map((resource) => (
                    <li
                      key={resource.fileId ?? resource.url ?? resource.fileName}
                      className="rounded-lg border border-white/15 bg-white/5 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium text-zinc-200">
                          {resource.fileName}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {resource.views} views / {resource.downloads} downloads
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="section-kicker mb-3">Search Query Performance</p>
            {!searchStats ? (
              <p className="text-sm text-zinc-400">Loading search stats...</p>
            ) : searchStats.totalQueries === 0 ? (
              <EmptyState title="No search queries logged yet." />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <MetricTile label="Queries" value={searchStats.totalQueries} />
                  <MetricTile label="Avg Latency" value={`${searchStats.averageLatencyMs} ms`} />
                  <MetricTile label="Slowest" value={`${searchStats.slowestLatencyMs} ms`} />
                  <MetricTile label="Failed" value={searchStats.failedQueries} />
                </div>
                <ul className="mt-4 space-y-2">
                  {searchStats.topQueries.map((query) => (
                    <li
                      key={query.query}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-3"
                    >
                      <p className="min-w-0 truncate text-sm font-medium text-zinc-200">
                        {query.query}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {query.count} searches / {query.averageLatencyMs} ms avg
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
