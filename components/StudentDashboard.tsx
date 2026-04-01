"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MainLayout from "./MainLayout";
import { SecondaryButton } from "./UIElements";

type StudentDashboardProps = {
  viewerName?: string;
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type StatCardProps = {
  label: string;
  value: number | string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

export default function StudentDashboard({ viewerName }: StudentDashboardProps) {
  const announcements = useQuery(api.announcements.getAnnouncements);
  const markAnnouncementRead = useMutation(api.announcements.markAnnouncementRead);
  const [pendingReadId, setPendingReadId] = useState<Id<"announcements"> | null>(null);

  const totalCount = announcements?.length ?? 0;
  const readCount = announcements?.filter((item) => item.isRead).length ?? 0;
  const unreadCount = totalCount ? totalCount - readCount : 0;
  const progress = totalCount ? Math.round((readCount / totalCount) * 100) : 0;
  const todayWindow = 24 * 60 * 60 * 1000;
  const freshCount = announcements?.filter((item) => Date.now() - item.updatedAt <= todayWindow).length ?? 0;
  const nextUnread = announcements?.find((item) => !item.isRead) ?? null;

  const handleMarkAsRead = async (announcementId: Id<"announcements">) => {
    setPendingReadId(announcementId);
    try {
      await markAnnouncementRead({ announcementId });
    } finally {
      setPendingReadId(null);
    }
  };

  return (
    <MainLayout roleLabel="Student">
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Student Workspace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            Welcome, {viewerName ?? "Student"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Review important notices, mark updates as completed, and keep your academic feed under
            control.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-zinc-200">
              {freshCount} posted today
            </span>
            <span className="rounded-full border border-white/30 bg-white/18 px-3 py-1 font-medium text-white">
              {unreadCount} unread
            </span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Announcements" value={totalCount} />
          <StatCard label="Unread" value={unreadCount} />
          <StatCard label="Read" value={readCount} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          <article className="surface-card p-5 md:p-6" id="announcements">
            <header className="flex items-center justify-between">
              <div>
                <p className="section-kicker">Announcement Feed</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Latest updates</h2>
              </div>
              <p className="text-sm text-zinc-400">Most recent first</p>
            </header>

            {announcements === undefined ? (
              <p className="mt-6 text-sm text-zinc-400">Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-400">No announcements are available right now.</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {announcements.map((announcement) => (
                  <li
                    key={announcement._id}
                    className={`rounded-lg border p-4 ${announcement.isRead ? "border-white/15 bg-white/5" : "border-white/30 bg-white/10"
                      }`}
                  >
                    <header className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-white">{announcement.title}</h3>
                        <p className="mt-1 text-xs text-zinc-400">Published {formatDate(announcement.updatedAt)}</p>
                      </div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.08em] ${announcement.isRead ? "text-zinc-400" : "text-zinc-100"
                          }`}
                      >
                        {announcement.isRead ? "Read" : "Unread"}
                      </p>
                    </header>

                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                      {announcement.content}
                    </p>

                    <SecondaryButton
                      className="mt-4 h-8 px-3 text-xs"
                      disabled={announcement.isRead || pendingReadId === announcement._id}
                      onClick={() => handleMarkAsRead(announcement._id)}
                    >
                      {announcement.isRead
                        ? "Marked read"
                        : pendingReadId === announcement._id
                          ? "Saving..."
                          : "Mark as read"}
                    </SecondaryButton>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <aside className="space-y-4">
            <article className="surface-card p-5">
              <p className="section-kicker">Reading Progress</p>
              <p className="mt-2 font-display text-4xl font-semibold text-white">{progress}%</p>
              <p className="mt-2 text-sm text-zinc-300">Percentage of visible notices that are marked as read.</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
              </div>
            </article>

            <article className="surface-card-muted p-5">
              <p className="section-kicker">Next Priority</p>
              {nextUnread ? (
                <>
                  <h3 className="mt-2 font-display text-xl font-semibold text-white">{nextUnread.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{nextUnread.content}</p>
                  <p className="mt-3 text-xs text-zinc-400">Updated {formatDate(nextUnread.updatedAt)}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-zinc-300">You are caught up with all announcements.</p>
              )}
            </article>
          </aside>
        </section>
      </div>
    </MainLayout>
  );
}
