"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
type DayName = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

type TimetableSlot = {
  day: DayName;
  startTime: string;
  endTime: string;
  room?: string;
  label?: string;
};

const targetRolesByAudience = {
  students: ["student"],
  studentsAndFaculty: ["student", "faculty"],
  all: ["student", "faculty", "admin"],
} as const;

const dayNames: DayName[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getDateDayName(dateValue: string) {
  if (!dateValue) return null;
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return dayNames[date.getDay()];
}

function combineDateAndTime(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue}`).getTime();
}

function getDurationMinutes(slot: TimetableSlot) {
  const start = combineDateAndTime("2000-01-01", slot.startTime);
  const end = combineDateAndTime("2000-01-01", slot.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return undefined;
  }
  return Math.round((end - start) / 60000);
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
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceSlotIndex, setAttendanceSlotIndex] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<Id<"attendanceSessions"> | "">("");
  const [isCreatingAttendanceSession, setIsCreatingAttendanceSession] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
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
  const firstManagedCourseId = managedCourses?.[0]?._id ?? "";
  const selectedAttendanceCourse = managedCourses?.find((course) => course._id === enrollmentCourseId) ?? null;
  const selectedAttendanceTimetable = (selectedAttendanceCourse?.timetable ?? []) as TimetableSlot[];
  const allowedAttendanceDays = useMemo(
    () => Array.from(new Set(selectedAttendanceTimetable.map((slot) => slot.day))),
    [selectedAttendanceTimetable],
  );
  const attendanceDayName = getDateDayName(attendanceDate);
  const availableSlotsForDate = useMemo(
    () =>
      attendanceDayName
        ? selectedAttendanceTimetable.filter((slot) => slot.day === attendanceDayName)
        : [],
    [attendanceDayName, selectedAttendanceTimetable],
  );
  const selectedAttendanceSlot =
    attendanceSlotIndex !== "" ? availableSlotsForDate[Number(attendanceSlotIndex)] : undefined;
  const canCreateAttendanceSession =
    Boolean(enrollmentCourseId && attendanceDate && selectedAttendanceSlot && allowedAttendanceDays.length > 0);

  useEffect(() => {
    if (!managedCourses || managedCourses.length === 0) {
      return;
    }

    const courseIds = new Set(managedCourses.map((course) => course._id));

    if (!gradeCourseId || !courseIds.has(gradeCourseId)) {
      setGradeCourseId(firstManagedCourseId);
      setGradeEnrollmentId("");
    }

    if (!assignmentCourseId || !courseIds.has(assignmentCourseId)) {
      setAssignmentCourseId(firstManagedCourseId);
    }

    if (!enrollmentCourseId || !courseIds.has(enrollmentCourseId)) {
      setEnrollmentCourseId(firstManagedCourseId);
      setSelectedSessionId("");
      setAttendanceDate("");
      setAttendanceSlotIndex("");
      setIsAttendanceModalOpen(false);
    }
  }, [assignmentCourseId, enrollmentCourseId, firstManagedCourseId, gradeCourseId, managedCourses]);

  useEffect(() => {
    if (!attendanceDate) {
      setAttendanceSlotIndex("");
      return;
    }

    if (availableSlotsForDate.length === 0) {
      setAttendanceSlotIndex("");
      return;
    }

    if (availableSlotsForDate.length === 1) {
      setAttendanceSlotIndex("0");
      return;
    }

    if (!availableSlotsForDate[Number(attendanceSlotIndex)]) {
      setAttendanceSlotIndex("");
    }
  }, [attendanceDate, attendanceSlotIndex, availableSlotsForDate]);

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

    if (!enrollmentCourseId || !selectedAttendanceCourse) {
      setAttendanceMessage("Choose a course before creating attendance.");
      return;
    }

    if (selectedAttendanceTimetable.length === 0) {
      setAttendanceMessage("This course has no timetable slots. Add timetable slots from Course Management first.");
      return;
    }

    if (!attendanceDate) {
      setAttendanceMessage("Choose a class date.");
      return;
    }

    if (!attendanceDayName || !allowedAttendanceDays.includes(attendanceDayName)) {
      setAttendanceMessage(
        `Choose a ${allowedAttendanceDays.join(" or ")} date for this course.`,
      );
      return;
    }

    if (!selectedAttendanceSlot) {
      setAttendanceMessage("Choose the class slot for this date.");
      return;
    }

    setIsCreatingAttendanceSession(true);
    setAttendanceMessage(null);

    try {
      const result = await createAttendanceSession({
        courseId: enrollmentCourseId,
        title: `${selectedAttendanceCourse.courseCode} attendance · ${attendanceDayName} ${selectedAttendanceSlot.startTime}`,
        startsAt: combineDateAndTime(attendanceDate, selectedAttendanceSlot.startTime),
        durationMinutes: getDurationMinutes(selectedAttendanceSlot),
      });
      setSelectedSessionId(result.id);
      setIsAttendanceModalOpen(true);
      setAttendanceMessage("Attendance session created.");
    } catch (error) {
      setAttendanceMessage(error instanceof Error ? error.message : "Unable to create attendance session.");
    } finally {
      setIsCreatingAttendanceSession(false);
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
              ) : classGrades.length === 0 ? (
                <p className="mt-5 text-sm text-zinc-400">No enrolled users found for this course.</p>
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
                          {[...row.grades].sort((left, right) => right.postedAt - left.postedAt).map((grade) => (
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
                {assignmentCourseId && assignments ? (
                  <p className="mt-2 text-sm text-zinc-400">
                    Showing {assignments.length} assignment{assignments.length === 1 ? "" : "s"} for the selected course.
                  </p>
                ) : null}
              </header>

              {!assignmentCourseId ? (
                <p className="mt-5 text-sm text-zinc-400">Choose a course to view assignments and submissions.</p>
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
                <div className="mt-5 overflow-x-auto rounded-lg border border-white/15">
                  <table className="w-full min-w-136 text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-[0.08em] text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Identifier</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {(courseRoster?.students ?? []).map((row) => (
                        <tr key={row.enrollment._id} className="bg-white/2">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-white">{row.student?.fullName ?? "Unknown user"}</p>
                            <p className="mt-1 text-xs text-zinc-400">{row.student?.email ?? "No email"}</p>
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {row.student?.enrollmentNumber ?? row.student?.employeeId ?? "No ID"}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">{row.student?.role ?? "user"}</td>
                          <td className="px-4 py-3 text-zinc-300">{row.enrollment.attendancePercentage ?? 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Attendance</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Date-wise marking</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  Attendance dates are restricted to the selected course timetable days.
                </p>
              </header>

              <form onSubmit={handleCreateAttendanceSession} className="mt-5 space-y-4">
                <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Allowed class days</p>
                  <p className="mt-2 text-sm text-zinc-200">
                    {allowedAttendanceDays.length > 0
                      ? allowedAttendanceDays.join(", ")
                      : "No timetable slots configured for this course."}
                  </p>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Class date</span>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      const nextDay = getDateDayName(nextDate);
                      setAttendanceDate(nextDate);
                      setSelectedSessionId("");
                      setIsAttendanceModalOpen(false);

                      if (nextDate && nextDay && !allowedAttendanceDays.includes(nextDay)) {
                        setAttendanceMessage(`This course does not meet on ${nextDay}. Choose ${allowedAttendanceDays.join(" or ")}.`);
                      } else {
                        setAttendanceMessage(null);
                      }
                    }}
                    disabled={!enrollmentCourseId || allowedAttendanceDays.length === 0}
                    className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>

                {availableSlotsForDate.length > 1 ? (
                  <label className="block space-y-1">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Class slot</span>
                    <select
                      value={attendanceSlotIndex}
                      onChange={(event) => setAttendanceSlotIndex(event.target.value)}
                      className="h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                    >
                      <option value="">Choose slot</option>
                      {availableSlotsForDate.map((slot, index) => (
                        <option key={`${slot.day}-${slot.startTime}-${slot.endTime}-${index}`} value={String(index)}>
                          {slot.startTime} - {slot.endTime}
                          {slot.room ? ` · ${slot.room}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Auto-filled time</span>
                    <input
                      value={selectedAttendanceSlot ? `${selectedAttendanceSlot.startTime} - ${selectedAttendanceSlot.endTime}` : "Select a valid class date"}
                      readOnly
                      className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-zinc-300 outline-none"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Room</span>
                    <input
                      value={selectedAttendanceSlot?.room ?? "Room TBA"}
                      readOnly
                      className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-zinc-300 outline-none"
                    />
                  </label>
                </div>

                <PrimaryButton type="submit" disabled={!canCreateAttendanceSession || isCreatingAttendanceSession}>
                  {isCreatingAttendanceSession ? "Opening roster..." : "Open attendance roster"}
                </PrimaryButton>
              </form>

              {attendanceMessage ? <p className="mt-3 text-sm text-zinc-300">{attendanceMessage}</p> : null}

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="section-kicker">Existing sessions</p>
                {sortedSessions.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-400">No attendance sessions created for this course yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {sortedSessions.slice(0, 6).map((session) => (
                      <li key={session._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/15 bg-white/5 p-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{session.title}</p>
                          <p className="mt-1 text-xs text-zinc-400">{formatDate(session.startsAt)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSessionId(session._id);
                            setIsAttendanceModalOpen(true);
                          }}
                          className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 hover:bg-white/10"
                        >
                          Open roster
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </section>
        )}

        {isAttendanceModalOpen && selectedSessionId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <section className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-xl border border-white/15 bg-zinc-950 shadow-2xl">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
                <div>
                  <p className="section-kicker">Attendance roster</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                    {attendanceRoster?.session.title ?? "Loading session"}
                  </h2>
                  {attendanceRoster?.session.startsAt ? (
                    <p className="mt-1 text-sm text-zinc-400">{formatDate(attendanceRoster.session.startsAt)}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 hover:bg-white/10"
                >
                  Close
                </button>
              </header>

              <div className="max-h-[65vh] overflow-y-auto p-5">
                {attendanceRoster === undefined ? (
                  <p className="text-sm text-zinc-400">Loading enrolled users...</p>
                ) : attendanceRoster.rows.length === 0 ? (
                  <p className="text-sm text-zinc-400">No users are enrolled in this course.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-white/15">
                    <table className="w-full min-w-2xl text-left text-sm">
                      <thead className="bg-white/5 text-xs uppercase tracking-[0.08em] text-zinc-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Student</th>
                          <th className="px-4 py-3 font-semibold">Current status</th>
                          <th className="px-4 py-3 font-semibold">Mark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {attendanceRoster.rows.map((row) => (
                          <tr key={row.enrollment._id} className="bg-white/2">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-white">{row.student?.fullName ?? "Unknown user"}</p>
                              <p className="mt-1 text-xs text-zinc-400">
                                {row.student?.enrollmentNumber ?? row.student?.email ?? "No identifier"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-zinc-300">{row.record?.status ?? "absent"}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {(["present", "late", "excused"] as AttendanceStatus[]).map((status) => {
                                  const busyKey = `${selectedSessionId}-${row.enrollment._id}-${status}`;
                                  return (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => handleMarkAttendance(row.enrollment._id, status)}
                                      disabled={markingAttendanceKey === busyKey}
                                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-60 ${row.record?.status === status
                                        ? "border-white/45 bg-white/20 text-white"
                                        : "border-white/20 text-zinc-200 hover:bg-white/10"
                                        }`}
                                    >
                                      {status}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
}
