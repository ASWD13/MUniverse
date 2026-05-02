"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MainLayout from "./MainLayout";

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

function ComingSoonCard({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-dashed border-white/15 bg-white/3 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">{label}</p>
        <p className="mt-2 font-display text-3xl font-semibold text-zinc-600">—</p>
      </div>
      <p className="mt-3 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function SectionPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/3 p-6 text-center">
      <p className="text-sm font-semibold text-zinc-500">{title}</p>
      <p className="mt-1 text-xs text-zinc-600">{description}</p>
    </div>
  );
}

// ── local types (mirrors what Convex returns) ─────────────────────────────────

type AppRole = "student" | "faculty" | "admin";

type AnnouncementItem = {
  _id: Id<"announcements">;
  title: string;
  targetRoles: AppRole[];
  updatedAt: number;
  isRead: boolean;
  readAt: number | null;
};

type AdminUserItem = {
  _id: Id<"users">;
  role: AppRole;
  fullName: string;
  email: string | null;
  department: string | null;
  enrollmentNumber: string | null;
  employeeId: string | null;
  isCurrentAdmin: boolean;
};

type FileItem = {
  _id: Id<"files">;
  url: string;
  clerkId: string;
  name?: string;
  size?: number;
  uploadedAt?: number;
};

// ── component ─────────────────────────────────────────────────────────────────

export default function UsageReports() {
  // Only using already-generated api entries — no npx convex dev needed
  const rawAnnouncements = useQuery(api.announcements.getAnnouncements);
  const rawUsers        = useQuery(api.users.listUsersForAdmin);
  const rawFiles        = useQuery(api.files.getCurrentUserFiles);

  const announcements = rawAnnouncements as AnnouncementItem[] | undefined;
  const users         = rawUsers        as AdminUserItem[]     | undefined;
  const files         = rawFiles        as FileItem[]          | undefined;

  const isLoading = announcements === undefined || users === undefined || files === undefined;

  // ── derived stats ──────────────────────────────────────────────────────────

  const userStats = useMemo(() => {
    if (!users) return null;
    const deptMap: Record<string, number> = {};
    for (const u of users) {
      if (u.department) deptMap[u.department] = (deptMap[u.department] ?? 0) + 1;
    }
    return {
      total:    users.length,
      students: users.filter((u) => u.role === "student").length,
      faculty:  users.filter((u) => u.role === "faculty").length,
      admins:   users.filter((u) => u.role === "admin").length,
      departmentBreakdown: Object.entries(deptMap)
        .map(([dept, count]) => ({ dept, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [users]);

  const announcementStats = useMemo(() => {
    if (!announcements) return null;
    const roleMap: Record<string, number> = { student: 0, faculty: 0, admin: 0 };
    for (const a of announcements) {
      for (const role of a.targetRoles) roleMap[role] = (roleMap[role] ?? 0) + 1;
    }
    return {
      total:      announcements.length,
      totalRead:  announcements.filter((a) => a.isRead).length,
      totalUnread: announcements.filter((a) => !a.isRead).length,
      roleTargetBreakdown: roleMap,
      perAnnouncement: [...announcements].sort((a, b) => b.updatedAt - a.updatedAt),
    };
  }, [announcements]);

  const fileStats = useMemo(() => {
    if (!files) return null;
    return {
      total:             files.length,
      totalStorageBytes: files.reduce((sum, f) => sum + (f.size ?? 0), 0),
    };
  }, [files]);

  const generatedAt = useMemo(() => Date.now(), []);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout roleLabel="Admin">
      <div className="w-full space-y-6">

        {/* Header */}
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Usage Reports</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            System Overview
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Live snapshot of portal activity across users, announcements, resources, and academic
            data. Sections marked as coming soon will auto-populate once the relevant backend APIs
            are deployed.
          </p>
          {!isLoading && (
            <p className="mt-3 text-xs text-zinc-500">
              Generated at {formatDate(generatedAt)}
            </p>
          )}
        </header>

        {/* Top-level stat cards */}
        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Total Users"    value={isLoading ? "..." : (userStats?.total ?? 0)} />
          <StatCard label="Announcements"  value={isLoading ? "..." : (announcementStats?.total ?? 0)} />
          <StatCard label="Files Uploaded" value={isLoading ? "..." : (fileStats?.total ?? 0)} />
          <StatCard
            label="Storage Used"
            value={isLoading ? "..." : formatBytes(fileStats?.totalStorageBytes ?? 0)}
          />
        </section>

        {/* Users & Announcements */}
        <section className="grid gap-6 lg:grid-cols-2">

          {/* User breakdown */}
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

            {isLoading || !userStats ? (
              <p className="mt-5 text-sm text-zinc-400">Loading...</p>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Students", value: userStats.students },
                    { label: "Faculty",  value: userStats.faculty  },
                    { label: "Admins",   value: userStats.admins   },
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

                {userStats.departmentBreakdown.length > 0 ? (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="section-kicker mb-3">By Department</p>
                    <ul className="space-y-2">
                      {userStats.departmentBreakdown.map(({ dept, count }) => (
                        <li
                          key={dept}
                          className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-2.5"
                        >
                          <p className="text-sm uppercase tracking-[0.06em] text-zinc-300">{dept}</p>
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

          {/* Announcement stats */}
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Communication Analytics</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                Announcement Reads
              </h2>
              <p className="mt-2 text-sm text-zinc-300">
                Read/unread breakdown, role targeting, and per-announcement status.
              </p>
            </header>

            {isLoading || !announcementStats ? (
              <p className="mt-5 text-sm text-zinc-400">Loading...</p>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Total",   value: announcementStats.total       },
                    { label: "Read",    value: announcementStats.totalRead   },
                    { label: "Unread",  value: announcementStats.totalUnread },
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

                {/* Role targeting */}
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="section-kicker mb-3">Announcements Targeting Each Role</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(announcementStats.roleTargetBreakdown).map(([role, count]) => (
                      <span
                        key={role}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-zinc-200"
                      >
                        {role}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Per-announcement list */}
                {announcementStats.perAnnouncement.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="section-kicker mb-3">Per-Announcement Status</p>
                    <ul className="space-y-2">
                      {announcementStats.perAnnouncement.map((a) => (
                        <li
                          key={a._id}
                          className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-zinc-200">{a.title}</p>
                            <p className="text-xs text-zinc-500">{formatDate(a.updatedAt)}</p>
                          </div>
                          <span className="ml-3 flex-shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                            {a.isRead ? "Read" : "Unread"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </article>
        </section>

        {/* Academic section — auto-populates once Anshika's APIs ship */}
        <section className="surface-card p-5 md:p-6">
          <header>
            <p className="section-kicker">Academic Analytics</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              Courses, Enrollments &amp; Grades
            </h2>
            
          </header>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <ComingSoonCard label="Courses"      description="Awaiting course data from backend" />
            <ComingSoonCard label="Enrollments"  description="Awaiting enrollment data"          />
            <ComingSoonCard label="Assignments"  description="Awaiting assignment data"          />
            <ComingSoonCard label="Grades Posted" description="Awaiting grades from faculty"     />
          </div>

          {/* Resource access — placeholder until Anshika adds access logging */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="section-kicker mb-3">Resource Access Stats</p>
            <SectionPlaceholder
              title="Per-resource download & view counts"
              description="Will auto-populate resource access-logging API is deployed. No changes needed here."
            />
          </div>

          {/* Search performance — placeholder until Rishi's perf hooks are live */}
          <div className="mt-4">
            <p className="section-kicker mb-3">Search Query Performance</p>
            <SectionPlaceholder
              title="Search latency & query counts"
              description="Will auto-populate  performance monitoring hooks are connected to the backend. No changes needed here."
            />
          </div>
        </section>

      </div>
    </MainLayout>
  );
}