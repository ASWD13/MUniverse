"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useUploadThing } from "@/utils/uploadthing";
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

type StudentAssignmentCardProps = {
  assignment: {
    _id: Id<"assignments">;
    title: string;
    course: string;
    dueDate: number;
    maxMarks: number;
    description?: string;
    fileUrl?: string;
    fileName?: string;
  };
  submission?: {
    status: "submitted" | "resubmitted" | "reviewed" | "late" | "flagged";
    submittedAt: number;
    feedback?: string;
    fileUrl?: string;
    fileName?: string;
    allowResubmission: boolean;
    plagiarismFlag: boolean;
  };
  onDownloadAssignment: (url: string, fileName: string) => void;
};

function StudentAssignmentCard({ assignment, submission, onDownloadAssignment }: StudentAssignmentCardProps) {
  const submitAssignment = useMutation(api.assignments.submitAssignment);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { startUpload } = useUploadThing("assignmentSubmissionUploader", {
    uploadProgressGranularity: "fine",
    onUploadProgress: (nextProgress) => setProgress(nextProgress),
    onUploadError: (error) => setMessage(error.message),
  });

  const canSubmit = !submission || submission.allowResubmission;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setMessage("Resubmission is not enabled for this assignment.");
      return;
    }

    if (!selectedFile && !note.trim()) {
      setMessage("Choose a file or add a note before submitting.");
      return;
    }

    setIsSubmitting(true);
    setProgress(selectedFile ? 1 : 100);
    setMessage(null);

    try {
      let uploadedFile:
        | {
            ufsUrl?: string;
            url?: string;
            key?: string;
            name?: string;
          }
        | undefined;

      if (selectedFile) {
        const uploaded = await startUpload([selectedFile]);
        uploadedFile = uploaded?.[0];
      }

      const fileUrl = uploadedFile?.ufsUrl ?? uploadedFile?.url;

      await submitAssignment({
        assignmentId: assignment._id,
        fileUrl,
        fileName: uploadedFile?.name ?? selectedFile?.name,
        fileKey: uploadedFile?.key,
        note: note.trim() || undefined,
      });

      setSelectedFile(null);
      setNote("");
      setProgress(100);
      setMessage("Submission saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <li className="rounded-lg border border-white/15 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{assignment.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-400">{assignment.course}</p>
        </div>
        <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-zinc-200">
          {submission?.status ?? "pending"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-300">
        <span>Due: {new Date(assignment.dueDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
        <span>Weightage: {assignment.maxMarks} marks</span>
      </div>
      {assignment.description ? <p className="mt-3 text-sm text-zinc-400">{assignment.description}</p> : null}
      {assignment.fileUrl ? (
        <a
          href={assignment.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onDownloadAssignment(assignment.fileUrl!, assignment.fileName || assignment.title)}
          className="mt-3 inline-block text-xs text-blue-400 transition-colors hover:text-blue-300"
        >
          Download Attached File ({assignment.fileName || "Attachment"})
        </a>
      ) : null}

      {submission ? (
        <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">
          Submitted {new Date(submission.submittedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          {submission.fileUrl ? (
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 font-semibold text-zinc-100 hover:text-white"
            >
              Open submission
            </a>
          ) : null}
          {submission.feedback ? <p className="mt-2 text-zinc-400">Feedback: {submission.feedback}</p> : null}
          {submission.plagiarismFlag ? <p className="mt-2 font-semibold text-red-300">Flagged for review</p> : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Submission file</span>
          <input
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            disabled={!canSubmit || isSubmitting}
            className="block w-full cursor-pointer rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-white/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        {selectedFile ? <p className="text-xs text-zinc-400">Ready: {selectedFile.name}</p> : null}
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            disabled={!canSubmit || isSubmitting}
            placeholder="Optional submission note"
            className="w-full resize-none rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        {isSubmitting ? (
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="rounded-md border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : canSubmit ? "Submit assignment" : "Submitted"}
        </button>
      </form>
    </li>
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
  const mySubmissions = useQuery(api.assignments.getMySubmissions);
  const logResourceAccess = useMutation(api.files.logResourceAccess);

  return (
    <StudentResourceShell
      kicker="Assignments"
      title="Assignment Center"
      description="Track every submission with due date, status, and expected weightage."
    >
      {myAssignments === undefined || mySubmissions === undefined ? (
         <p className="text-sm text-zinc-400">Loading assignments...</p>
      ) : myAssignments.length === 0 ? (
         <p className="text-sm text-zinc-400">No active assignments found.</p>
      ) : (
      <ul className="space-y-3">
        {myAssignments.map((assignment) => {
          const submission = mySubmissions.find((item) => item.assignmentId === assignment._id);
          return (
            <StudentAssignmentCard
              key={assignment._id}
              assignment={assignment}
              submission={submission}
              onDownloadAssignment={(url, fileName) => {
                void logResourceAccess({
                  url,
                  fileName,
                  accessType: "download",
                });
              }}
            />
          );
        })}
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
  type CourseFile = NonNullable<typeof courseFiles>[number];
  type ResourceGroup = {
    id: string;
    title: string;
    description?: string;
    courseCode: string;
    courseTitle: string;
    files: CourseFile[];
    latestUploadedAt: number;
  };
  const groupedResources = Object.values(
    filteredResources.reduce<Record<string, ResourceGroup>>((groups, resource) => {
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
        courseTitle: resource.course?.title ?? "Course material",
        files: [resource],
        latestUploadedAt: resource.uploadedAt ?? 0,
      };
      return groups;
    }, {}),
  ).sort((left, right) => right.latestUploadedAt - left.latestUploadedAt);

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
      ) : groupedResources.length === 0 ? (
        <div className="py-10 text-center text-zinc-400">
          <p>No materials found matching &quot;{searchQuery}&quot;.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groupedResources.map((resource) => (
            <article key={resource.id} className="rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                {resource.courseCode} · {resource.courseTitle}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{resource.title}</p>
              {resource.description ? <p className="mt-2 text-sm text-zinc-300">{resource.description}</p> : null}
              <ul className="mt-4 space-y-2">
                {resource.files.map((file) => (
                  <li key={file._id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2">
                    <span className="min-w-0 truncate text-xs text-zinc-300">{file.name ?? file.title ?? "File"}</span>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        void logResourceAccess({
                          fileId: file._id,
                          accessType: "view",
                        });
                      }}
                      className="rounded-md border border-white/20 bg-white/8 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/14"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </StudentResourceShell>
  );
}
