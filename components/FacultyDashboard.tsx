"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MainLayout from "./MainLayout";
import { FormInput, PrimaryButton, SecondaryButton } from "./UIElements";

type FacultyDashboardProps = {
  viewerName?: string;
};

type Audience = "students" | "studentsAndFaculty" | "all";

const targetRolesByAudience = {
  students: ["student"],
  studentsAndFaculty: ["student", "faculty"],
  all: ["student", "faculty", "admin"],
} as const;

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

export default function FacultyDashboard({ viewerName }: FacultyDashboardProps) {
  const announcements = useQuery(api.announcements.getAnnouncements);
  const createAnnouncement = useMutation(api.announcements.createAnnouncement);
  const markAnnouncementRead = useMutation(api.announcements.markAnnouncementRead);

  const [noticeTitle, setNoticeTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [audience, setAudience] = useState<Audience>("studentsAndFaculty");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<Id<"announcements"> | null>(null);

  const totalCount = announcements?.length ?? 0;
  const readCount = announcements?.filter((item) => item.isRead).length ?? 0;
  const unreadCount = totalCount ? totalCount - readCount : 0;
  const completion = totalCount ? Math.round((readCount / totalCount) * 100) : 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!noticeTitle.trim() || !noticeContent.trim() || !selectedClass.trim()) {
      setSubmitError("Title, class, and notice content are required.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const contentParts = [noticeContent.trim(), `Class: ${selectedClass}`];

    if (scheduledDate.trim()) {
      contentParts.push(`Scheduled for: ${new Date(scheduledDate).toLocaleString("en-IN")}`);
    }

    try {
      await createAnnouncement({
        title: noticeTitle,
        content: contentParts.join("\n\n"),
        targetRoles: [...targetRolesByAudience[audience]],
      });

      setNoticeTitle("");
      setSelectedClass("");
      setNoticeContent("");
      setScheduledDate("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to post notice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkRead = async (announcementId: Id<"announcements">) => {
    setMarkingReadId(announcementId);

    try {
      await markAnnouncementRead({ announcementId });
    } finally {
      setMarkingReadId(null);
    }
  };

  return (
    <MainLayout roleLabel="Faculty">
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Faculty Workspace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            Broadcast center for {viewerName ?? "Faculty"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Publish structured notices, target the right audience, and monitor reading completion
            from one place.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Visible" value={totalCount} />
          <StatCard label="Unread" value={unreadCount} />
          <StatCard label="Read" value={readCount} />
          <StatCard label="Completion" value={`${completion}%`} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Create Notice</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">Publish update</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Add title, class context, and recipients before posting.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <FormInput
                label="Notice title"
                type="text"
                placeholder="e.g., Lab rescheduled"
                value={noticeTitle}
                onChange={(event) => setNoticeTitle(event.target.value)}
                required
              />

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Class</span>
                <select
                  value={selectedClass}
                  onChange={(event) => setSelectedClass(event.target.value)}
                  className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  required
                >
                  <option value="">Choose class</option>
                  <option value="DBMS-301">DBMS-301</option>
                  <option value="Computer Networks-202">Computer Networks-202</option>
                  <option value="Operating Systems-101">Operating Systems-101</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Notice content</span>
                <textarea
                  value={noticeContent}
                  onChange={(event) => setNoticeContent(event.target.value)}
                  rows={5}
                  placeholder="Write your notice"
                  className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  required
                />
              </label>

              <FormInput
                label="Scheduled date and time"
                type="datetime-local"
                value={scheduledDate}
                onChange={(event) => setScheduledDate(event.target.value)}
              />

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Target audience</span>
                <select
                  value={audience}
                  onChange={(event) => setAudience(event.target.value as Audience)}
                  className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                >
                  <option value="students">Students</option>
                  <option value="studentsAndFaculty">Students and faculty</option>
                  <option value="all">Everyone (including admins)</option>
                </select>
              </label>

              {submitError ? <p className="text-sm font-medium text-zinc-200">{submitError}</p> : null}

              <PrimaryButton className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Publishing..." : "Publish notice"}
              </PrimaryButton>
            </form>
          </article>

          <div className="space-y-4">
            <article className="surface-card-muted p-5">
              <p className="section-kicker">Audience Reference</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                <li>Students: student</li>
                <li>Students and faculty: student, faculty</li>
                <li>Everyone: student, faculty, admin</li>
              </ul>
            </article>

            <article className="surface-card p-5 md:p-6">
              <header className="flex items-center justify-between">
                <div>
                  <p className="section-kicker">Notice Stream</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-white">Recent broadcasts</h2>
                </div>
                <p className="text-sm text-zinc-400">Faculty-visible feed</p>
              </header>

              {announcements === undefined ? (
                <p className="mt-5 text-sm text-zinc-400">Loading notices...</p>
              ) : announcements.length === 0 ? (
                <p className="mt-5 text-sm text-zinc-400">No notices posted yet.</p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {announcements.map((notice) => (
                    <li key={notice._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                      <header className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-lg font-semibold text-white">{notice.title}</h3>
                          <p className="mt-1 text-xs text-zinc-400">{formatDate(notice.updatedAt)}</p>
                        </div>
                        <p
                          className={`text-xs font-semibold uppercase tracking-[0.08em] ${notice.isRead ? "text-zinc-400" : "text-zinc-100"
                            }`}
                        >
                          {notice.isRead ? "Read" : "Unread"}
                        </p>
                      </header>

                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                        {notice.content}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {notice.targetRoles.map((role) => (
                          <span
                            key={`${notice._id}-${role}`}
                            className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase text-zinc-200"
                          >
                            {role}
                          </span>
                        ))}
                      </div>

                      <SecondaryButton
                        className="mt-4 h-8 px-3 text-xs"
                        type="button"
                        onClick={() => handleMarkRead(notice._id)}
                        disabled={notice.isRead || markingReadId === notice._id}
                      >
                        {notice.isRead
                          ? "Marked read"
                          : markingReadId === notice._id
                            ? "Saving..."
                            : "Mark as read"}
                      </SecondaryButton>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
