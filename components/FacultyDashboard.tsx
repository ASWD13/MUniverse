"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MainLayout from "./MainLayout";
import { FormInput, PrimaryButton, SecondaryButton } from "./UIElements";

type FacultyDashboardProps = {
  viewerName?: string;
};

type Audience = "students" | "studentsAndFaculty" | "all";
type DashboardTab = "announcements" | "grades" | "assignments" | "enrollments";
type AssessmentType = "assignment" | "midterm" | "final" | "project" | "quiz";
type AttendanceStatus = "present" | "absent" | "late" | "excused";

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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

function AssignmentSubmissionSummary({ assignmentId }: { assignmentId: Id<"assignments"> }) {
  const submissions = useQuery(api.assignments.getSubmissionsByAssignment, { assignmentId });
  const reviewSubmission = useMutation(api.assignments.reviewSubmission);
  const [busyId, setBusyId] = useState<Id<"assignmentSubmissions"> | null>(null);

  const markReviewed = async (submissionId: Id<"assignmentSubmissions">) => {
    setBusyId(submissionId);
    try {
      await reviewSubmission({
        submissionId,
        status: "reviewed",
        allowResubmission: false,
        plagiarismFlag: false,
      });
    } finally {
      setBusyId(null);
    }
  };

  if (submissions === undefined) {
    return <p className="mt-3 text-xs text-zinc-400">Loading submissions...</p>;
  }

  if (submissions.length === 0) {
    return <p className="mt-3 text-xs text-zinc-400">No submissions yet.</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {submissions.map((submission) => (
        <li key={submission._id} className="rounded-md border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-white">
                {submission.student?.fullName ?? "Unknown student"}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-zinc-400">
                {submission.status}
                {submission.plagiarismFlag ? " · flagged" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {submission.fileUrl ? (
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-white/20 px-2 py-1 text-[11px] font-semibold uppercase text-zinc-200 hover:bg-white/10"
                >
                  Open
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => markReviewed(submission._id)}
                disabled={busyId === submission._id || submission.status === "reviewed"}
                className="rounded-md border border-white/20 px-2 py-1 text-[11px] font-semibold uppercase text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submission.status === "reviewed" ? "Reviewed" : busyId === submission._id ? "Saving" : "Mark reviewed"}
              </button>
            </div>
          </div>
          {submission.note ? <p className="mt-2 text-xs text-zinc-400">{submission.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export default function FacultyDashboard({ viewerName }: FacultyDashboardProps) {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as DashboardTab) || "announcements";

  const announcements = useQuery(api.announcements.getAnnouncements);
  const managedCourses = useQuery(api.courses.getMyManagedCourses);
  const createAnnouncement = useMutation(api.announcements.createAnnouncement);
  const markAnnouncementRead = useMutation(api.announcements.markAnnouncementRead);
  const uploadAssignment = useMutation(api.assignments.uploadAssignment);
  const postMark = useMutation(api.grades.postMark);
  const createAttendanceSession = useMutation(api.enrollments.createAttendanceSession);
  const markAttendance = useMutation(api.enrollments.markAttendance);

  const [noticeTitle, setNoticeTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<Id<"courses"> | "">("");
  const [noticeContent, setNoticeContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [audience, setAudience] = useState<Audience>("studentsAndFaculty");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<Id<"announcements"> | null>(null);

  const [gradeCourseId, setGradeCourseId] = useState<Id<"courses"> | "">("");
  const [gradeEnrollmentId, setGradeEnrollmentId] = useState<Id<"enrollments"> | "">("");
  const [markValue, setMarkValue] = useState("");
  const [maxMark, setMaxMark] = useState("100");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("assignment");
  const [feedback, setFeedback] = useState("");
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentCourseId, setAssignmentCourseId] = useState<Id<"courses"> | "">("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [assignmentMaxMarks, setAssignmentMaxMarks] = useState("100");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  const [enrollmentCourseId, setEnrollmentCourseId] = useState<Id<"courses"> | "">("");
  const [attendanceTitle, setAttendanceTitle] = useState("");
  const [attendanceStart, setAttendanceStart] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<Id<"attendanceSessions"> | "">("");
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);
  const [markingAttendanceKey, setMarkingAttendanceKey] = useState<string | null>(null);

  const gradeRoster = useQuery(
    api.enrollments.getCourseRoster,
    gradeCourseId ? { courseId: gradeCourseId } : "skip",
  );
  const classGrades = useQuery(
    api.grades.getClassGrades,
    gradeCourseId ? { courseId: gradeCourseId } : "skip",
  );
  const assignments = useQuery(
    api.assignments.getAssignmentsByCourse,
    assignmentCourseId ? { courseId: assignmentCourseId } : "skip",
  );
  const courseRoster = useQuery(
    api.enrollments.getCourseRoster,
    enrollmentCourseId ? { courseId: enrollmentCourseId } : "skip",
  );
  const attendanceSessions = useQuery(
    api.enrollments.getAttendanceSessionsByCourse,
    enrollmentCourseId ? { courseId: enrollmentCourseId } : "skip",
  );
  const attendanceRoster = useQuery(
    api.enrollments.getAttendanceRoster,
    selectedSessionId ? { sessionId: selectedSessionId } : "skip",
  );

  const totalCount = announcements?.length ?? 0;
  const readCount = announcements?.filter((item) => item.isRead).length ?? 0;
  const unreadCount = totalCount ? totalCount - readCount : 0;
  const completion = totalCount ? Math.round((readCount / totalCount) * 100) : 0;

  const sortedSessions = useMemo(
    () => [...(attendanceSessions ?? [])].sort((left, right) => right.startsAt - left.startsAt),
    [attendanceSessions],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!noticeTitle.trim() || !noticeContent.trim() || !selectedCourseId) {
      setSubmitError("Title, course, and notice content are required.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const contentParts = [noticeContent.trim()];
    if (scheduledDate.trim()) {
      contentParts.push(`Scheduled for: ${new Date(scheduledDate).toLocaleString("en-IN")}`);
    }

    try {
      await createAnnouncement({
        title: noticeTitle,
        content: contentParts.join("\n\n"),
        courseId: selectedCourseId,
        targetRoles: [...targetRolesByAudience[audience]],
      });

      setNoticeTitle("");
      setSelectedCourseId("");
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

  const handlePostMark = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!gradeCourseId || !gradeEnrollmentId || !markValue.trim() || !maxMark.trim()) {
      setGradeError("Course, student, mark, and max mark are required.");
      return;
    }

    const mark = parseFloat(markValue);
    const max = parseFloat(maxMark);

    if (isNaN(mark) || isNaN(max)) {
      setGradeError("Mark values must be valid numbers.");
      return;
    }

    if (mark > max) {
      setGradeError("Mark cannot exceed max mark.");
      return;
    }

    if (max <= 0) {
      setGradeError("Max mark must be greater than 0.");
      return;
    }

    setGradeError(null);
    setIsSubmittingGrade(true);

    try {
      await postMark({
        enrollmentId: gradeEnrollmentId,
        mark,
        maxMark: max,
        assessmentType,
        feedback: feedback.trim() || undefined,
      });
      setGradeEnrollmentId("");
      setMarkValue("");
      setMaxMark("100");
      setFeedback("");
      setGradeError("Mark posted.");
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : "Unable to post mark.");
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const handleUploadAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignmentTitle.trim() || !assignmentCourseId) {
      setAssignmentError("Assignment title and course are required.");
      return;
    }

    if (!assignmentDueDate) {
      setAssignmentError("Due date is required.");
      return;
    }

    const maxMarks = parseFloat(assignmentMaxMarks);
    if (isNaN(maxMarks) || maxMarks <= 0) {
      setAssignmentError("Max marks must be a positive number.");
      return;
    }

    setAssignmentError(null);
    setIsSubmittingAssignment(true);

    try {
      await uploadAssignment({
        courseId: assignmentCourseId,
        title: assignmentTitle,
        description: assignmentDescription.trim() || undefined,
        dueDate: new Date(assignmentDueDate).getTime(),
        maxMarks,
      });

      setAssignmentTitle("");
      setAssignmentDescription("");
      setAssignmentDueDate("");
      setAssignmentMaxMarks("100");
      setAssignmentError("Assignment created.");
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "Unable to upload assignment.");
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleCreateAttendanceSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!enrollmentCourseId || !attendanceTitle.trim() || !attendanceStart) {
      setAttendanceMessage("Course, session title, and date are required.");
      return;
    }

    try {
      const result = await createAttendanceSession({
        courseId: enrollmentCourseId,
        title: attendanceTitle,
        startsAt: new Date(attendanceStart).getTime(),
        durationMinutes: 50,
      });
      setSelectedSessionId(result.id);
      setAttendanceTitle("");
      setAttendanceStart("");
      setAttendanceMessage("Attendance session created.");
    } catch (error) {
      setAttendanceMessage(error instanceof Error ? error.message : "Unable to create attendance session.");
    }
  };

  const handleMarkAttendance = async (enrollmentId: Id<"enrollments">, status: AttendanceStatus) => {
    if (!selectedSessionId) return;

    const key = `${selectedSessionId}-${enrollmentId}-${status}`;
    setMarkingAttendanceKey(key);

    try {
      await markAttendance({ sessionId: selectedSessionId, enrollmentId, status });
      setAttendanceMessage("Attendance updated.");
    } catch (error) {
      setAttendanceMessage(error instanceof Error ? error.message : "Unable to mark attendance.");
    } finally {
      setMarkingAttendanceKey(null);
    }
  };

  return (
    <MainLayout roleLabel="Faculty">
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Faculty Workspace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            Academic Management Center for {viewerName ?? "Faculty"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Manage course notices, grades, assignment submissions, and attendance from live Convex data.
          </p>
        </header>

        {activeTab === "announcements" && (
          <>
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
                  <h2 className="mt-1 font-display text-2xl font-semibold text-white">Publish course update</h2>
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
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Course</span>
                    <select
                      value={selectedCourseId}
                      onChange={(event) => setSelectedCourseId(event.target.value as Id<"courses"> | "")}
                      className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                      required
                    >
                      <option value="">Choose course</option>
                      {(managedCourses ?? []).map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.courseCode} · {course.title}
                        </option>
                      ))}
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
                      <option value="all">Everyone</option>
                    </select>
                  </label>

                  {submitError ? <p className="text-sm font-medium text-red-400">{submitError}</p> : null}

                  <PrimaryButton className="w-full" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Publishing..." : "Publish notice"}
                  </PrimaryButton>
                </form>
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
                          <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${notice.isRead ? "text-zinc-400" : "text-zinc-100"}`}>
                            {notice.isRead ? "Read" : "Unread"}
                          </p>
                        </header>

                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                          {notice.content}
                        </p>

                        <SecondaryButton
                          className="mt-4 h-8 px-3 text-xs"
                          type="button"
                          onClick={() => handleMarkRead(notice._id)}
                          disabled={notice.isRead || markingReadId === notice._id}
                        >
                          {notice.isRead ? "Marked read" : markingReadId === notice._id ? "Saving..." : "Mark as read"}
                        </SecondaryButton>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>
          </>
        )}

        {activeTab === "grades" && (
          <section className="grid gap-6 lg:grid-cols-2">
            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Post Marks</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Record student grades</h2>
              </header>

              <form onSubmit={handlePostMark} className="mt-5 space-y-4">
                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Course</span>
                  <select
                    value={gradeCourseId}
                    onChange={(event) => {
                      setGradeCourseId(event.target.value as Id<"courses"> | "");
                      setGradeEnrollmentId("");
                    }}
                    className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                    required
                  >
                    <option value="">Choose course</option>
                    {(managedCourses ?? []).map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.courseCode} · {course.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Student</span>
                  <select
                    value={gradeEnrollmentId}
                    onChange={(event) => setGradeEnrollmentId(event.target.value as Id<"enrollments"> | "")}
                    className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                    required
                    disabled={!gradeCourseId || gradeRoster === undefined}
                  >
                    <option value="">Choose enrolled user</option>
                    {(gradeRoster?.students ?? []).map((row) => (
                      <option key={row.enrollment._id} value={row.enrollment._id}>
                        {row.student?.fullName ?? "Unknown"} · {row.student?.role ?? "user"}
                      </option>
                    ))}
                  </select>
                </label>

                <FormInput label="Mark Obtained" type="number" value={markValue} onChange={(event) => setMarkValue(event.target.value)} min="0" required />
                <FormInput label="Max Mark" type="number" value={maxMark} onChange={(event) => setMaxMark(event.target.value)} min="1" required />

                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Assessment Type</span>
                  <select
                    value={assessmentType}
                    onChange={(event) => setAssessmentType(event.target.value as AssessmentType)}
                    className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                    <option value="project">Project</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Feedback</span>
                  <textarea
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    rows={3}
                    placeholder="Optional feedback"
                    className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  />
                </label>

                {gradeError ? <p className="text-sm font-medium text-zinc-200">{gradeError}</p> : null}

                <PrimaryButton className="w-full" type="submit" disabled={isSubmittingGrade}>
                  {isSubmittingGrade ? "Posting..." : "Post mark"}
                </PrimaryButton>
              </form>
            </article>

            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Grade Overview</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Class grades</h2>
              </header>

              {!gradeCourseId ? (
                <p className="mt-5 text-sm text-zinc-400">Choose a course to view posted grades.</p>
              ) : classGrades === undefined ? (
                <p className="mt-5 text-sm text-zinc-400">Loading grades...</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {classGrades.map((row) => (
                    <li key={row.enrollment._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {[row.student?.firstName, row.student?.lastName].filter(Boolean).join(" ") ||
                              row.student?.email ||
                              "Unknown student"}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">{row.grades.length} posted marks</p>
                        </div>
                      </div>
                      {row.grades.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {row.grades.map((grade) => (
                            <span key={grade._id} className="rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-xs text-zinc-200">
                              {grade.assessmentType}: {grade.mark}/{grade.maxMark}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}

        {activeTab === "assignments" && (
          <section className="grid gap-6 lg:grid-cols-2">
            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Assignments</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Create new assignment</h2>
              </header>

              <form onSubmit={handleUploadAssignment} className="mt-5 space-y-4">
                <FormInput label="Assignment Title" type="text" value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} required />

                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Course</span>
                  <select
                    value={assignmentCourseId}
                    onChange={(event) => setAssignmentCourseId(event.target.value as Id<"courses"> | "")}
                    className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                    required
                  >
                    <option value="">Choose course</option>
                    {(managedCourses ?? []).map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.courseCode} · {course.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Description</span>
                  <textarea
                    value={assignmentDescription}
                    onChange={(event) => setAssignmentDescription(event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  />
                </label>

                <FormInput label="Due Date" type="datetime-local" value={assignmentDueDate} onChange={(event) => setAssignmentDueDate(event.target.value)} required />
                <FormInput label="Max Marks" type="number" value={assignmentMaxMarks} onChange={(event) => setAssignmentMaxMarks(event.target.value)} min="1" required />

                {assignmentError ? <p className="text-sm font-medium text-zinc-200">{assignmentError}</p> : null}

                <PrimaryButton className="w-full" type="submit" disabled={isSubmittingAssignment}>
                  {isSubmittingAssignment ? "Creating..." : "Create assignment"}
                </PrimaryButton>
              </form>
            </article>

            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Submissions</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Assignment list</h2>
              </header>

              {!assignmentCourseId ? (
                <p className="mt-5 text-sm text-zinc-400">Choose a course in the form to view assignments and submissions.</p>
              ) : assignments === undefined ? (
                <p className="mt-5 text-sm text-zinc-400">Loading assignments...</p>
              ) : assignments.length === 0 ? (
                <p className="mt-5 text-sm text-zinc-400">No assignments created for this course.</p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {assignments.map((assignment) => (
                    <li key={assignment._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{assignment.title}</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Due {formatDate(assignment.dueDate)} · {assignment.maxMarks} marks
                          </p>
                        </div>
                      </div>
                      {assignment.description ? <p className="mt-3 text-sm text-zinc-300">{assignment.description}</p> : null}
                      <AssignmentSubmissionSummary assignmentId={assignment._id} />
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}

        {activeTab === "enrollments" && (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Rosters</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Course enrollment</h2>
              </header>

              <label className="mt-5 block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Course</span>
                <select
                  value={enrollmentCourseId}
                  onChange={(event) => {
                    setEnrollmentCourseId(event.target.value as Id<"courses"> | "");
                    setSelectedSessionId("");
                  }}
                  className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Choose course</option>
                  {(managedCourses ?? []).map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseCode} · {course.title}
                    </option>
                  ))}
                </select>
              </label>

              {courseRoster === undefined && enrollmentCourseId ? (
                <p className="mt-5 text-sm text-zinc-400">Loading roster...</p>
              ) : !enrollmentCourseId ? (
                <p className="mt-5 text-sm text-zinc-400">Choose a course to see enrolled users.</p>
              ) : courseRoster?.students.length === 0 ? (
                <p className="mt-5 text-sm text-zinc-400">No users enrolled in this course.</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {(courseRoster?.students ?? []).map((row) => (
                    <li key={row.enrollment._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-white">{row.student?.fullName ?? "Unknown user"}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {row.student?.email ?? "No email"} · {row.student?.role ?? "user"}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">
                        Legacy attendance: {row.enrollment.attendancePercentage ?? 0}%
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Attendance</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Date-wise marking</h2>
              </header>

              <form onSubmit={handleCreateAttendanceSession} className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_auto]">
                <FormInput label="Session title" type="text" value={attendanceTitle} onChange={(event) => setAttendanceTitle(event.target.value)} />
                <FormInput label="Starts at" type="datetime-local" value={attendanceStart} onChange={(event) => setAttendanceStart(event.target.value)} />
                <div className="flex items-end">
                  <PrimaryButton type="submit" disabled={!enrollmentCourseId}>
                    Create
                  </PrimaryButton>
                </div>
              </form>

              {sortedSessions.length > 0 ? (
                <label className="mt-4 block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Attendance session</span>
                  <select
                    value={selectedSessionId}
                    onChange={(event) => setSelectedSessionId(event.target.value as Id<"attendanceSessions"> | "")}
                    className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  >
                    <option value="">Choose session</option>
                    {sortedSessions.map((session) => (
                      <option key={session._id} value={session._id}>
                        {session.title} · {formatDate(session.startsAt)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {attendanceMessage ? <p className="mt-3 text-sm text-zinc-300">{attendanceMessage}</p> : null}

              {!selectedSessionId ? (
                <p className="mt-5 text-sm text-zinc-400">Create or select a session to mark attendance.</p>
              ) : attendanceRoster === undefined ? (
                <p className="mt-5 text-sm text-zinc-400">Loading attendance roster...</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {attendanceRoster.rows.map((row) => (
                    <li key={row.enrollment._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{row.student?.fullName ?? "Unknown user"}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-400">
                            {row.record?.status ?? "unmarked"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((status) => {
                            const busyKey = `${selectedSessionId}-${row.enrollment._id}-${status}`;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleMarkAttendance(row.enrollment._id, status)}
                                disabled={markingAttendanceKey === busyKey}
                                className="rounded-md border border-white/20 px-2 py-1 text-[11px] font-semibold uppercase text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
