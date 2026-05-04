"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import MainLayout from "./MainLayout";

type PlannerSlot = {
  course: string;
  slot: string;
  room: string;
  faculty: string;
};

const plannerSlots: PlannerSlot[] = [
  { course: "DBMS", slot: "09:00 - 09:50", room: "Block C, 204", faculty: "Dr. Mehta" },
  { course: "Operating Systems", slot: "11:00 - 11:50", room: "Block A, 112", faculty: "Prof. Sharma" },
  { course: "Computer Networks", slot: "14:00 - 14:50", room: "Block B, 305", faculty: "Dr. Joseph" },
  { course: "AI Lab", slot: "16:00 - 17:30", room: "Innovation Lab", faculty: "Prof. Rao" },
];

type StudentResourceShellProps = {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
};

function StudentResourceShellContent({ kicker, title, description, children }: StudentResourceShellProps) {
  const searchParams = useSearchParams();
  const workspaceOverride = searchParams.get("workspace");
  const dashboardHref =
    workspaceOverride && workspaceOverride !== "admin"
      ? `/dashboard?workspace=${workspaceOverride}`
      : "/dashboard";

  return (
    <MainLayout roleLabel="Student">
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">{kicker}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">{description}</p>
          <Link
            href={dashboardHref}
            className="mt-5 inline-flex rounded-lg border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/14"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="surface-card p-5 md:p-6">{children}</section>
      </div>
    </MainLayout>
  );
}

function StudentResourceShell(props: StudentResourceShellProps) {
  return (
    <Suspense fallback={<div className="h-dvh bg-black" />}>
      <StudentResourceShellContent {...props} />
    </Suspense>
  );
}

export function StudentPlannerView() {
  const myEnrollments = useQuery(api.enrollments.getMyEnrollments, {});
  const courseSlots = (myEnrollments ?? []).flatMap((enrollment) => {
    const course = enrollment.course;
    if (!course) {
      return [];
    }

    return (course.timetable ?? []).map((slot) => ({
      course: `${course.courseCode} · ${course.title}`,
      slot: `${slot.day}, ${slot.startTime} - ${slot.endTime}`,
      room: slot.room ?? "Room TBA",
      faculty: slot.label ?? "Assigned faculty",
    }));
  });
  const visibleSlots = courseSlots.length > 0 ? courseSlots : plannerSlots;

  return (
    <StudentResourceShell
      kicker="Planner"
      title="Planner Overview"
      description="Expanded class flow with room, slot, and faculty context for your day."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {visibleSlots.map((slot) => (
          <article key={`${slot.course}-${slot.slot}`} className="rounded-lg border border-white/15 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{slot.course}</p>
            <p className="mt-2 text-sm font-semibold text-white">{slot.slot}</p>
            <p className="mt-1 text-sm text-zinc-300">{slot.room}</p>
            <p className="mt-1 text-xs text-zinc-400">Faculty: {slot.faculty}</p>
          </article>
        ))}
      </div>
    </StudentResourceShell>
  );
}

export function StudentAssignmentsView() {
  const myAssignments = useQuery(api.assignments.getMyAssignments);
  const logResourceAccess = useMutation(api.files.logResourceAccess);

  function formatDateFriendly(timestamp: number) {
    return new Date(timestamp).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <StudentResourceShell
      kicker="Assignments"
      title="Assignment Center"
      description="Track every submission with due date, status, and expected weightage."
    >
      {myAssignments === undefined ? (
         <p className="text-sm text-zinc-400">Loading assignments...</p>
      ) : myAssignments.length === 0 ? (
         <p className="text-sm text-zinc-400">No active assignments found.</p>
      ) : (
      <ul className="space-y-3">
        {myAssignments.map((assignment) => (
          <li key={assignment._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{assignment.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-400">{assignment.course}</p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-zinc-200">
                Pending
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-300">
              <span>Due: {formatDateFriendly(assignment.dueDate)}</span>
              <span>Weightage: {assignment.maxMarks} marks</span>
            </div>
            {assignment.description && (
              <p className="mt-3 text-sm text-zinc-400">{assignment.description}</p>
            )}
            {assignment.fileUrl && (
               <a
                 href={assignment.fileUrl}
                 target="_blank"
                 rel="noopener noreferrer"
                 onClick={() => {
                   void logResourceAccess({
                     url: assignment.fileUrl,
                     fileName: assignment.fileName || assignment.title,
                     accessType: "download",
                   });
                 }}
                 className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors inline-block"
               >
                 Download Attached File ({assignment.fileName || "Attachment"})
               </a>
            )}
          </li>
        ))}
      </ul>
      )}
    </StudentResourceShell>
  );
}

export function StudentAttendanceView() {
  const myAttendance = useQuery(api.enrollments.getMyAttendance);

  return (
    <StudentResourceShell
      kicker="Attendance"
      title="Attendance Monitor"
      description="Expanded attendance view with course percentage and minimum threshold checks."
    >
      {myAttendance === undefined ? (
        <p className="text-sm text-zinc-400">Loading attendance data...</p>
      ) : myAttendance.length === 0 ? (
        <p className="text-sm text-zinc-400">No courses enrolled yet.</p>
      ) : (
      <ul className="space-y-3">
        {myAttendance.map((record) => {
          const percentage = record.percentage;
          const isSafe = percentage >= record.threshold;

          return (
            <li key={record.courseCode} className="rounded-lg border border-white/15 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{record.course}</p>
                <p className={`text-sm font-semibold ${isSafe ? "text-zinc-100" : "text-zinc-300"}`}>
                  {percentage}%
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                threshold {record.threshold}%
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${percentage}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      )}
    </StudentResourceShell>
  );
}

export function StudentGradesView() {
  const myGrades = useQuery(api.grades.getMyGrades);

  return (
    <StudentResourceShell
      kicker="Grades"
      title="Academic Performance"
      description="View your grades, assessment marks, and feedback across enrolled courses."
    >
      {myGrades === undefined ? (
        <p className="text-sm text-zinc-400">Loading grades...</p>
      ) : myGrades.length === 0 ? (
        <p className="text-sm text-zinc-400">No grades available for your enrolled courses yet.</p>
      ) : (
        <div className="space-y-6">
          {myGrades.map(({ course, enrollment, grades }, index) => {
            const courseTitle = course?.title || "Unknown Course";
            const courseCode = course?.courseCode || "N/A";
            
            return (
              <div key={course?._id ?? enrollment._id ?? `grades-${index}`} className="rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                <div className="bg-white/5 px-4 py-3 border-b border-white/10">
                  <h3 className="font-semibold text-white">{courseTitle}</h3>
                  <p className="text-xs uppercase tracking-wider text-zinc-400">{courseCode}</p>
                </div>
                <div className="p-4">
                  {grades.length === 0 ? (
                    <p className="text-sm text-zinc-400 italic">No grades posted yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {grades.map((grade) => (
                        <li key={grade._id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-white/5 p-3">
                          <div>
                            <p className="text-sm font-medium text-zinc-200 capitalize">{grade.assessmentType}</p>
                            {grade.feedback && <p className="mt-1 text-xs text-zinc-400">&quot;{grade.feedback}&quot;</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-display text-lg font-semibold text-white">
                              {grade.mark} <span className="text-sm text-zinc-400 font-normal">/ {grade.maxMark}</span>
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentResourceShell>
  );
}

export function StudentResourcesView() {
  const [searchQuery, setSearchQuery] = useState("");
  const logSearchQuery = useMutation(api.search.logSearchQuery);
  const logResourceAccess = useMutation(api.files.logResourceAccess);
  const courseFiles = useQuery(api.files.getMyCourseFiles, {});

  const filteredResources = (courseFiles ?? []).filter(res => 
    (res.title ?? res.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (res.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (res.course?.courseCode ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (res.course?.title ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    const timeout = window.setTimeout(() => {
      const startedAt = performance.now();
      const resultCount = (courseFiles ?? []).filter((resource) =>
        (resource.title ?? resource.name ?? "").toLowerCase().includes(trimmedQuery.toLowerCase()) ||
        (resource.description ?? "").toLowerCase().includes(trimmedQuery.toLowerCase()) ||
        (resource.course?.courseCode ?? "").toLowerCase().includes(trimmedQuery.toLowerCase()) ||
        (resource.course?.title ?? "").toLowerCase().includes(trimmedQuery.toLowerCase()),
      ).length;
      const latencyMs = Math.round(performance.now() - startedAt);

      void logSearchQuery({
        query: trimmedQuery,
        surface: "student-resources",
        latencyMs,
        resultCount,
        status: "success",
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [courseFiles, logSearchQuery, searchQuery]);

  return (
    <StudentResourceShell
      kicker="Resources"
      title="Course Materials & Search"
      description="Find study materials, prep kits, and mentor hour links across your coursework."
    >
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="search"
          placeholder="Search materials by title, description, or type..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none transition-colors"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {courseFiles === undefined ? (
        <div className="py-10 text-center text-zinc-400">
          <p>Loading course materials...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="py-10 text-center text-zinc-400">
          <p>No materials found matching &quot;{searchQuery}&quot;.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredResources.map((resource) => (
            <article key={resource._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                {resource.course?.courseCode ?? "Course"}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{resource.title ?? resource.name ?? "Course resource"}</p>
              {resource.description ? <p className="mt-2 text-sm text-zinc-300">{resource.description}</p> : null}
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void logResourceAccess({
                    fileId: resource._id,
                    accessType: "view",
                  });
                }}
                className="mt-4 inline-flex rounded-md border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/14"
              >
                Open resource
              </a>
            </article>
          ))}
        </div>
      )}
    </StudentResourceShell>
  );
}
