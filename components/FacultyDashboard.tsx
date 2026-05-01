"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MainLayout from "./MainLayout";
import { FormInput, PrimaryButton, SecondaryButton } from "./UIElements";

type FacultyDashboardProps = {
  viewerName?: string;
  userId?: Id<"users">;
};

type Audience = "students" | "studentsAndFaculty" | "all";
type DashboardTab = "announcements" | "grades" | "assignments" | "enrollments";

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

export default function FacultyDashboard({ viewerName, userId }: FacultyDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("announcements");

  // Announcements state and mutations
  const announcements = useQuery(api.announcements.getAnnouncements);
  const createAnnouncement = useMutation(api.announcements.createAnnouncement);
  const markAnnouncementRead = useMutation(api.announcements.markAnnouncementRead);

  // Form states
  const [noticeTitle, setNoticeTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [audience, setAudience] = useState<Audience>("studentsAndFaculty");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<Id<"announcements"> | null>(null);

  // Grade form states
  const [studentName, setStudentName] = useState("");
  const [markValue, setMarkValue] = useState("");
  const [maxMark, setMaxMark] = useState("100");
  const [assessmentType, setAssessmentType] = useState<"assignment" | "midterm" | "final" | "project" | "quiz">("assignment");
  const [feedback, setFeedback] = useState("");
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Assignment form states
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [assignmentMaxMarks, setAssignmentMaxMarks] = useState("100");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

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

  const handlePostMark = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!studentName.trim() || !markValue.trim() || !maxMark.trim()) {
      setGradeError("Student name, mark, and max mark are required.");
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
      // Clear form and show success message
      setStudentName("");
      setMarkValue("");
      setMaxMark("100");
      setFeedback("");
      alert("Mark posted successfully for " + studentName);
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : "Unable to post mark.");
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const handleUploadAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignmentTitle.trim()) {
      setAssignmentError("Assignment title is required.");
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
      // Clear form and show success message
      setAssignmentTitle("");
      setAssignmentDescription("");
      setAssignmentDueDate("");
      setAssignmentMaxMarks("100");
      alert("Assignment uploaded successfully");
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "Unable to upload assignment.");
    } finally {
      setIsSubmittingAssignment(false);
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
            Manage announcements, grades, assignments, and student enrollments in one unified platform.
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="surface-card flex overflow-x-auto gap-2 p-3">
          <button
            onClick={() => setActiveTab("announcements")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === "announcements"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Announcements
          </button>
          <button
            onClick={() => setActiveTab("grades")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === "grades"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Grades & Marks
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === "assignments"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Assignments
          </button>
          <button
            onClick={() => setActiveTab("enrollments")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === "enrollments"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Student Enrollment
          </button>
        </div>

        {/* Announcements Tab */}
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

                  {submitError ? <p className="text-sm font-medium text-red-400">{submitError}</p> : null}

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
                              className={`text-xs font-semibold uppercase tracking-[0.08em] ${
                                notice.isRead ? "text-zinc-400" : "text-zinc-100"
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
          </>
        )}

        {/* Grades & Marks Tab */}
        {activeTab === "grades" && (
          <section className="grid gap-6 lg:grid-cols-2">
            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Post Marks</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Record student grades</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  Enter student marks for various assessments and provide feedback.
                </p>
              </header>

              <form onSubmit={handlePostMark} className="mt-5 space-y-4">
                <FormInput
                  label="Student Name"
                  type="text"
                  placeholder="e.g., John Doe"
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  required
                />

                <FormInput
                  label="Mark Obtained"
                  type="number"
                  placeholder="e.g., 85"
                  value={markValue}
                  onChange={(event) => setMarkValue(event.target.value)}
                  min="0"
                  required
                />

                <FormInput
                  label="Max Mark"
                  type="number"
                  placeholder="e.g., 100"
                  value={maxMark}
                  onChange={(event) => setMaxMark(event.target.value)}
                  min="1"
                  required
                />

                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Assessment Type</span>
                  <select
                    value={assessmentType}
                    onChange={(event) =>
                      setAssessmentType(event.target.value as typeof assessmentType)
                    }
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
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Feedback (Optional)</span>
                  <textarea
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    rows={3}
                    placeholder="Provide constructive feedback"
                    className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  />
                </label>

                {gradeError ? <p className="text-sm font-medium text-red-400">{gradeError}</p> : null}

                <PrimaryButton className="w-full" type="submit" disabled={isSubmittingGrade}>
                  {isSubmittingGrade ? "Posting..." : "Post Mark"}
                </PrimaryButton>
              </form>
            </article>

            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Grade Overview</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Class grades</h2>
              </header>

              <div className="mt-5 space-y-3">
                <p className="text-sm text-zinc-300">Manage grades for all enrolled students</p>
                <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Recent Grades</p>
                  <p className="mt-3 text-sm text-zinc-400">
                    Grades posted for students will appear here. Use the form on the left to post new marks.
                  </p>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* Assignments Tab */}
        {activeTab === "assignments" && (
          <section className="grid gap-6 lg:grid-cols-2">
            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Upload Assignment</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Create new assignment</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  Upload assignments for students to complete by the due date.
                </p>
              </header>

              <form onSubmit={handleUploadAssignment} className="mt-5 space-y-4">
                <FormInput
                  label="Assignment Title"
                  type="text"
                  placeholder="e.g., Database Design Project"
                  value={assignmentTitle}
                  onChange={(event) => setAssignmentTitle(event.target.value)}
                  required
                />

                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Description</span>
                  <textarea
                    value={assignmentDescription}
                    onChange={(event) => setAssignmentDescription(event.target.value)}
                    rows={3}
                    placeholder="Describe the assignment requirements"
                    className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  />
                </label>

                <FormInput
                  label="Due Date"
                  type="datetime-local"
                  value={assignmentDueDate}
                  onChange={(event) => setAssignmentDueDate(event.target.value)}
                  required
                />

                <FormInput
                  label="Max Marks"
                  type="number"
                  placeholder="e.g., 100"
                  value={assignmentMaxMarks}
                  onChange={(event) => setAssignmentMaxMarks(event.target.value)}
                  min="1"
                  required
                />

                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Attach File (Optional)</span>
                  <input
                    type="file"
                    className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-white/20"
                  />
                </label>

                {assignmentError ? <p className="text-sm font-medium text-red-400">{assignmentError}</p> : null}

                <PrimaryButton className="w-full" type="submit" disabled={isSubmittingAssignment}>
                  {isSubmittingAssignment ? "Uploading..." : "Upload Assignment"}
                </PrimaryButton>
              </form>
            </article>

            <article className="surface-card p-5 md:p-6">
              <header>
                <p className="section-kicker">Assignment List</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Your assignments</h2>
              </header>

              <div className="mt-5 space-y-3">
                <p className="text-sm text-zinc-300">Manage your uploaded assignments</p>
                <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Recent Assignments</p>
                  <p className="mt-3 text-sm text-zinc-400">
                    Assignments you upload will appear here. Students will be able to view and submit responses.
                  </p>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* Enrollments Tab */}
        {activeTab === "enrollments" && (
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Student Enrollment</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">View enrolled students</h2>
              <p className="mt-2 text-sm text-zinc-300">
                See all students enrolled in your courses and manage their attendance.
              </p>
            </header>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-300">Student Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-300">Course</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-300">Attendance</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-400 text-sm">
                      No student enrollments to display yet. Enrollments will appear here once students are added to your courses.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        )}
      </div>
    </MainLayout>
  );
}
