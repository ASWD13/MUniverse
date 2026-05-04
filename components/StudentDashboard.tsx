"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MainLayout from "./MainLayout";
import { SecondaryButton } from "./UIElements";

type StudentDashboardProps = {
  viewerName?: string;
};

type StudentFeatureKey = "planner" | "assignments" | "attendance" | "grades" | "resources";

type FeatureOption = {
  key: StudentFeatureKey;
  label: string;
  summary: string;
  helper: string;
};

type PlannerSlot = {
  course: string;
  slot: string;
  room: string;
  day?: string;
  faculty?: string;
};

const plannerSlots: PlannerSlot[] = [
  { course: "DBMS", slot: "09:00 - 09:50", room: "Block C, 204" },
  { course: "Operating Systems", slot: "11:00 - 11:50", room: "Block A, 112" },
  { course: "Computer Networks", slot: "14:00 - 14:50", room: "Block B, 305" },
];

const featureRouteByKey: Record<StudentFeatureKey, string> = {
  planner: "/dashboard/planner",
  assignments: "/dashboard/assignments",
  attendance: "/dashboard/attendance",
  grades: "/dashboard/grades",
  resources: "/dashboard/resources",
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

type FeatureOptionCardProps = {
  option: FeatureOption;
  isActive: boolean;
  href: string;
  onSelect: (key: StudentFeatureKey) => void;
};

function ExpandRouteButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-white/6 text-zinc-200 transition hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
        <path d="M6 4H12V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11.5 4.5L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </Link>
  );
}

function FeatureOptionCard({ option, isActive, href, onSelect }: FeatureOptionCardProps) {
  return (
    <article
      className={`w-full rounded-xl border p-4 text-left transition ${isActive
        ? "border-white/45 bg-white/14"
        : "border-white/15 bg-white/5 hover:bg-white/10 active:bg-white/14"
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{option.label}</p>
        <ExpandRouteButton href={href} label={`Open ${option.label}`} />
      </div>
      <button
        type="button"
        onClick={() => onSelect(option.key)}
        className="mt-2 w-full text-left"
        aria-pressed={isActive}
      >
        <p className="font-display text-xl font-semibold text-white">{option.summary}</p>
        <p className="mt-2 text-sm text-zinc-300">{option.helper}</p>
      </button>
    </article>
  );
}

export default function StudentDashboard({ viewerName }: StudentDashboardProps) {
  const searchParams = useSearchParams();
  const announcements = useQuery(api.announcements.getAnnouncements);
  const markAnnouncementRead = useMutation(api.announcements.markAnnouncementRead);
  const [pendingReadId, setPendingReadId] = useState<Id<"announcements"> | null>(null);
  const [activeFeature, setActiveFeature] = useState<StudentFeatureKey>("planner");

  const totalCount = announcements?.length ?? 0;
  const readCount = announcements?.filter((item) => item.isRead).length ?? 0;
  const unreadCount = totalCount ? totalCount - readCount : 0;
  const progress = totalCount ? Math.round((readCount / totalCount) * 100) : 0;
  const todayWindow = 24 * 60 * 60 * 1000;
  const freshCount = announcements?.filter((item) => Date.now() - item.updatedAt <= todayWindow).length ?? 0;
  const nextUnread = announcements?.find((item) => !item.isRead) ?? null;
  const myAssignments = useQuery(api.assignments.getMyAssignments);
  const mySubmissions = useQuery(api.assignments.getMySubmissions);
  const myAttendance = useQuery(api.enrollments.getMyAttendance);
  const myEnrollments = useQuery(api.enrollments.getMyEnrollments, {});
  const myCourseFiles = useQuery(api.files.getMyCourseFiles, {});

  const pendingAssignments = myAssignments?.filter((assignment) => {
    const submission = mySubmissions?.find((item) => item.assignmentId === assignment._id);
    return !submission || submission.status !== "reviewed";
  }).length ?? 0;
  const averageAttendance = myAttendance && myAttendance.length > 0 
    ? Math.round(myAttendance.reduce((sum, record) => sum + record.percentage, 0) / myAttendance.length)
    : 0;
  const timetableSlots: PlannerSlot[] = (myEnrollments ?? []).flatMap((enrollment) => {
    const course = enrollment.course;
    if (!course) {
      return [];
    }

    return (course.timetable ?? []).map((slot) => ({
      course: `${course.courseCode} · ${course.title}`,
      day: slot.day,
      slot: `${slot.startTime} - ${slot.endTime}`,
      room: slot.room ?? "Room TBA",
      faculty: slot.label,
    }));
  });
  const visiblePlannerSlots = timetableSlots.length > 0 ? timetableSlots : plannerSlots;
  type CourseFile = NonNullable<typeof myCourseFiles>[number];
  const resourceEntries = Object.values(
    (myCourseFiles ?? []).reduce<Record<string, { id: string; title: string; description?: string; courseCode: string; files: CourseFile[]; latestUploadedAt: number }>>(
      (groups, resource) => {
        const id = resource.resourceGroupId ?? String(resource._id);
        const existing = groups[id];
        if (existing) {
          existing.files.push(resource);
          existing.latestUploadedAt = Math.max(existing.latestUploadedAt, resource.uploadedAt ?? 0);
          return groups;
        }

        groups[id] = {
          id,
          title: resource.title ?? resource.name ?? "Course resource",
          description: resource.description ?? undefined,
          courseCode: resource.course?.courseCode ?? "Course",
          files: [resource],
          latestUploadedAt: resource.uploadedAt ?? 0,
        };
        return groups;
      },
      {},
    ),
  ).sort((left, right) => right.latestUploadedAt - left.latestUploadedAt);
  const resourceCount = resourceEntries.length;

  const featureOptions: FeatureOption[] = [
    {
      key: "planner",
      label: "Class planner",
      summary: `${visiblePlannerSlots.length} weekly slots`,
      helper: "Review your enrolled course timetable.",
    },
    {
      key: "assignments",
      label: "Assignments",
      summary: `${pendingAssignments} active tasks`,
      helper: "Track pending and in-review coursework before deadlines.",
    },
    {
      key: "attendance",
      label: "Attendance",
      summary: `${averageAttendance}% average`,
      helper: "Monitor attendance health across core subjects.",
    },
    {
      key: "grades",
      label: "Grades",
      summary: "Academic Performance",
      helper: "View marks and feedback for your assessments.",
    },
    {
      key: "resources",
      label: "Academic resources",
      summary: `${resourceCount} course files`,
      helper: "Open uploaded materials from your enrolled courses.",
    },
  ];

  const workspaceOverride = searchParams.get("workspace");

  const featureHref = (key: StudentFeatureKey) => {
    const baseHref = featureRouteByKey[key];

    if (!workspaceOverride || workspaceOverride === "admin") {
      return baseHref;
    }

    return `${baseHref}?workspace=${workspaceOverride}`;
  };

  const handleMarkAsRead = async (announcementId: Id<"announcements">) => {
    setPendingReadId(announcementId);
    try {
      await markAnnouncementRead({ announcementId });
    } finally {
      setPendingReadId(null);
    }
  };

  const renderFeaturePanel = () => {
    if (activeFeature === "planner") {
      return (
        <article className="surface-card p-5 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="section-kicker">Planner</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-white">Today at a glance</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200">
                Live schedule
              </span>
              <ExpandRouteButton href={featureHref("planner")} label="Expand planner" />
            </div>
          </header>

          <ul className="mt-5 grid gap-3 md:grid-cols-3">
            {visiblePlannerSlots.map((slot, index) => (
              <li key={`${slot.course}-${slot.slot}-${index}`} className="rounded-lg border border-white/15 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{slot.course}</p>
                {slot.day ? <p className="mt-2 text-sm font-semibold text-white">{slot.day}</p> : null}
                <p className="mt-2 text-sm font-semibold text-zinc-100">{slot.slot}</p>
                <p className="mt-1 text-sm text-zinc-300">{slot.room}</p>
              </li>
            ))}
          </ul>
        </article>
      );
    }

    if (activeFeature === "assignments") {
      return (
        <article className="surface-card p-5 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="section-kicker">Assignments</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-white">Submission tracker</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200">
                {pendingAssignments} pending
              </span>
              <ExpandRouteButton href={featureHref("assignments")} label="Expand assignments" />
            </div>
          </header>

          <ul className="mt-5 space-y-3">
            {!myAssignments ? (
               <p className="text-sm text-zinc-400">Loading...</p>
            ) : myAssignments.length === 0 ? (
               <p className="text-sm text-zinc-400">All caught up!</p>
            ) : (
            myAssignments.slice(0, 3).map((item) => (
              <li key={item._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-400">{item.course}</p>
                  </div>
                  {(() => {
                    const submission = mySubmissions?.find((entry) => entry.assignmentId === item._id);
                    return (
                      <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-zinc-200">
                        {submission?.status ?? "pending"}
                      </span>
                    );
                  })()}
                </div>
                <p className="mt-3 text-sm text-zinc-300">Due: {formatDate(item.dueDate)}</p>
              </li>
            )))}
          </ul>
        </article>
      );
    }

    if (activeFeature === "attendance") {
      return (
        <article className="surface-card p-5 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="section-kicker">Attendance</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-white">Course-wise monitor</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200">
                {averageAttendance}% average
              </span>
              <ExpandRouteButton href={featureHref("attendance")} label="Expand attendance" />
            </div>
          </header>

          <ul className="mt-5 space-y-3">
            {!myAttendance ? (
               <p className="text-sm text-zinc-400">Loading...</p>
            ) : myAttendance.length === 0 ? (
               <p className="text-sm text-zinc-400">Not enrolled in any courses</p>
            ) : (
            myAttendance.map((record) => {
              const percentage = record.percentage;

              return (
                <li key={record.courseCode} className="rounded-lg border border-white/15 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{record.course}</p>
                    <p className="text-sm text-zinc-200">{percentage}%</p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Target threshold: {record.threshold}%
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-white transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                </li>
              );
            }))}
          </ul>
        </article>
      );
    }

    if (activeFeature === "grades") {
      return (
        <article className="surface-card p-5 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="section-kicker">Grades</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-white">Performance breakdown</h3>
            </div>
            <ExpandRouteButton href={featureHref("grades")} label="Expand grades" />
          </header>
          <p className="mt-5 text-sm text-zinc-300">
            Open the full expanded view to check breakdown.
          </p>
          <div className="mt-4">
             <Link
                href={featureHref("grades")}
                className="inline-flex rounded-lg border border-white/20 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 hover:bg-white/14"
              >
                View Grades
              </Link>
          </div>
        </article>
      );
    }

    return (
      <article className="surface-card p-5 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="section-kicker">Resources</p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-white">Quick academic links</h3>
            <p className="mt-2 text-sm text-zinc-300">Open common student tools without leaving the workspace.</p>
          </div>
          <ExpandRouteButton href={featureHref("resources")} label="Expand resources" />
        </header>

        {myCourseFiles === undefined ? (
          <p className="mt-5 text-sm text-zinc-400">Loading course files...</p>
        ) : myCourseFiles.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-400">No course files have been uploaded for your enrolled courses yet.</p>
        ) : (
          <ul className="mt-5 grid gap-3 md:grid-cols-3">
            {resourceEntries.slice(0, 6).map((resource) => (
              <li key={resource.id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                  {resource.courseCode}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{resource.title}</p>
                {resource.description ? <p className="mt-2 text-sm text-zinc-300">{resource.description}</p> : null}
                <p className="mt-2 text-xs text-zinc-400">
                  {resource.files.length} file{resource.files.length === 1 ? "" : "s"}
                </p>
                <a
                  href={resource.files[0]?.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 hover:text-white"
                >
                  Open first file
                </a>
              </li>
            ))}
          </ul>
        )}
      </article>
    );
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

        <section className="space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="section-kicker">Features</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">Student Resources</h2>
            </div>
            <p className="text-sm text-zinc-400">Choose an option to focus your workflow.</p>
          </header>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {featureOptions.map((option) => (
              <FeatureOptionCard
                key={option.key}
                option={option}
                isActive={activeFeature === option.key}
                href={featureHref(option.key)}
                onSelect={setActiveFeature}
              />
            ))}
          </div>

          {renderFeaturePanel()}
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
      </div >
    </MainLayout >
  );
}
