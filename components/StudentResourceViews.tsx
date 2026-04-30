"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import MainLayout from "./MainLayout";

type PlannerSlot = {
  course: string;
  slot: string;
  room: string;
  faculty: string;
};

type AssignmentItem = {
  title: string;
  course: string;
  due: string;
  status: "Pending" | "In review" | "Submitted";
  weightage: string;
};

type AttendanceItem = {
  course: string;
  attended: number;
  total: number;
  threshold: number;
};

type ResourceItem = {
  title: string;
  description: string;
  type: string;
};

const plannerSlots: PlannerSlot[] = [
  { course: "DBMS", slot: "09:00 - 09:50", room: "Block C, 204", faculty: "Dr. Mehta" },
  { course: "Operating Systems", slot: "11:00 - 11:50", room: "Block A, 112", faculty: "Prof. Sharma" },
  { course: "Computer Networks", slot: "14:00 - 14:50", room: "Block B, 305", faculty: "Dr. Joseph" },
  { course: "AI Lab", slot: "16:00 - 17:30", room: "Innovation Lab", faculty: "Prof. Rao" },
];

const assignments: AssignmentItem[] = [
  {
    title: "Normalization worksheet",
    course: "DBMS",
    due: "Apr 8, 11:59 PM",
    status: "Pending",
    weightage: "10%",
  },
  {
    title: "Packet trace analysis",
    course: "Networks",
    due: "Apr 9, 05:00 PM",
    status: "In review",
    weightage: "8%",
  },
  {
    title: "Process scheduling lab",
    course: "OS",
    due: "Apr 11, 11:59 PM",
    status: "Submitted",
    weightage: "12%",
  },
  {
    title: "Model evaluation note",
    course: "AI",
    due: "Apr 14, 09:00 PM",
    status: "Pending",
    weightage: "6%",
  },
];

const attendanceRecords: AttendanceItem[] = [
  { course: "DBMS", attended: 31, total: 36, threshold: 75 },
  { course: "Operating Systems", attended: 28, total: 34, threshold: 75 },
  { course: "Computer Networks", attended: 30, total: 35, threshold: 75 },
  { course: "AI Lab", attended: 16, total: 20, threshold: 80 },
];

const resources: ResourceItem[] = [
  {
    title: "Course repository",
    description: "Slides, lab sheets, and lecture recordings from all registered courses.",
    type: "Learning",
  },
  {
    title: "Exam prep kit",
    description: "Past papers, model answers, and unit-wise revision checklist.",
    type: "Assessment",
  },
  {
    title: "Mentor office hours",
    description: "Book a support slot with your allocated faculty mentor.",
    type: "Mentoring",
  },
  {
    title: "Skill bridge",
    description: "Practice sets and aptitude modules for internship preparation.",
    type: "Career",
  },
];

type StudentResourceShellProps = {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
};

function StudentResourceShell({ kicker, title, description, children }: StudentResourceShellProps) {
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

export function StudentPlannerView() {
  return (
    <StudentResourceShell
      kicker="Planner"
      title="Planner Overview"
      description="Expanded class flow with room, slot, and faculty context for your day."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {plannerSlots.map((slot) => (
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
  return (
    <StudentResourceShell
      kicker="Assignments"
      title="Assignment Center"
      description="Track every submission with due date, status, and expected weightage."
    >
      <ul className="space-y-3">
        {assignments.map((assignment) => (
          <li key={assignment.title} className="rounded-lg border border-white/15 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{assignment.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-400">{assignment.course}</p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-zinc-200">
                {assignment.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-300">
              <span>Due: {assignment.due}</span>
              <span>Weightage: {assignment.weightage}</span>
            </div>
          </li>
        ))}
      </ul>
    </StudentResourceShell>
  );
}

export function StudentAttendanceView() {
  return (
    <StudentResourceShell
      kicker="Attendance"
      title="Attendance Monitor"
      description="Expanded attendance view with course percentage and minimum threshold checks."
    >
      <ul className="space-y-3">
        {attendanceRecords.map((record) => {
          const percentage = Math.round((record.attended / record.total) * 100);
          const isSafe = percentage >= record.threshold;

          return (
            <li key={record.course} className="rounded-lg border border-white/15 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{record.course}</p>
                <p className={`text-sm font-semibold ${isSafe ? "text-zinc-100" : "text-zinc-300"}`}>
                  {percentage}%
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {record.attended}/{record.total} classes attended • threshold {record.threshold}%
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${percentage}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </StudentResourceShell>
  );
}

export function StudentResourcesView() {
  return (
    <StudentResourceShell
      kicker="Resources"
      title="Student Resources"
      description="Consolidated links and support resources for academics, mentoring, and placement prep."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {resources.map((resource) => (
          <article key={resource.title} className="rounded-lg border border-white/15 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{resource.type}</p>
            <p className="mt-2 text-sm font-semibold text-white">{resource.title}</p>
            <p className="mt-2 text-sm text-zinc-300">{resource.description}</p>
            <button
              type="button"
              className="mt-4 inline-flex rounded-md border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/14"
            >
              Open resource
            </button>
          </article>
        ))}
      </div>
    </StudentResourceShell>
  );
}
