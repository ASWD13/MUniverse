"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FormInput, PrimaryButton, SecondaryButton } from "./UIElements";

type DayName = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

type TimetableSlot = {
  day: DayName;
  startTime: string;
  endTime: string;
  room?: string;
  label?: string;
};

type AppUser = {
  _id: Id<"users">;
  role: "student" | "faculty" | "admin";
  fullName: string;
  email: string | null;
  department: string | null;
  enrollmentNumber: string | null;
  employeeId: string | null;
};

type CourseRow = {
  _id: Id<"courses">;
  courseCode: string;
  title: string;
  credits: number;
  facultyId: Id<"users">;
  facultyName: string;
  semester: number;
  description?: string;
  timetable?: TimetableSlot[];
  enrolledCount: number;
  resourceCount: number;
};

const DAYS: DayName[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function emptySlot(day: DayName = "Monday"): TimetableSlot {
  return { day, startTime: "", endTime: "", room: "", label: "" };
}

function userSearchText(user: AppUser) {
  return [
    user.fullName,
    user.email,
    user.department,
    user.enrollmentNumber,
    user.employeeId,
    user.role,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function parseCsvRollNumbers(text: string) {
  return text
    .split(/[\n,;\r\t ]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function CourseManagement() {
  const courses = useQuery(api.courses.listCoursesForAdmin) as CourseRow[] | undefined;
  const users = useQuery(api.users.listUsersForAdmin) as AppUser[] | undefined;
  const createCourse = useMutation(api.courses.upsertCourseForAdmin);
  const updateCourse = useMutation(api.courses.updateCourseForAdmin);
  const deleteCourse = useMutation(api.courses.deleteCourseForAdmin);
  const enrollStudent = useMutation(api.enrollments.upsertEnrollmentForAdmin);
  const removeStudent = useMutation(api.enrollments.removeStudentFromCourse);
  const bulkEnroll = useMutation(api.enrollments.bulkEnrollByRollNumbers);

  const [selectedCourseId, setSelectedCourseId] = useState<Id<"courses"> | null>(null);
  const roster = useQuery(
    api.enrollments.getCourseRoster,
    selectedCourseId ? { courseId: selectedCourseId } : "skip",
  );

  const [editingCourseId, setEditingCourseId] = useState<Id<"courses"> | null>(null);
  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [credits, setCredits] = useState("3");
  const [semester, setSemester] = useState("1");
  const [description, setDescription] = useState("");
  const [facultySearch, setFacultySearch] = useState("");
  const [facultyId, setFacultyId] = useState<Id<"users"> | "">("");
  const [timetable, setTimetable] = useState<TimetableSlot[]>([emptySlot()]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState<Id<"users"> | "">("");
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const assignableUsers = useMemo(
    () => (users ?? []).filter((user) => user.role === "faculty" || user.role === "admin"),
    [users],
  );

  const enrollmentUsers = useMemo(
    () => users ?? [],
    [users],
  );

  const selectedCourse = courses?.find((course) => course._id === selectedCourseId) ?? null;
  const enrolledStudentIds = useMemo(
    () => new Set(roster?.students.map((row) => row.student?._id).filter(Boolean) ?? []),
    [roster?.students],
  );

  const facultyRecommendations = useMemo(() => {
    const query = facultySearch.trim().toLowerCase();
    return assignableUsers
      .filter((user) => !query || userSearchText(user).includes(query))
      .sort((left, right) => {
        if (left.role !== right.role) {
          return left.role === "faculty" ? -1 : 1;
        }
        return left.fullName.localeCompare(right.fullName);
      });
  }, [assignableUsers, facultySearch]);

  const studentRecommendations = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return enrollmentUsers
      .filter((user) => !enrolledStudentIds.has(user._id))
      .filter((user) => !query || userSearchText(user).includes(query))
      .sort((left, right) => {
        const roleOrder = { student: 0, faculty: 1, admin: 2 };
        if (left.role !== right.role) {
          return roleOrder[left.role] - roleOrder[right.role];
        }
        return left.fullName.localeCompare(right.fullName);
      });
  }, [enrolledStudentIds, enrollmentUsers, studentSearch]);

  const resetForm = () => {
    setEditingCourseId(null);
    setCourseCode("");
    setTitle("");
    setCredits("3");
    setSemester("1");
    setDescription("");
    setFacultySearch("");
    setFacultyId("");
    setTimetable([emptySlot()]);
  };

  const startEdit = (course: CourseRow) => {
    setEditingCourseId(course._id);
    setCourseCode(course.courseCode);
    setTitle(course.title);
    setCredits(String(course.credits));
    setSemester(String(course.semester));
    setDescription(course.description ?? "");
    setFacultyId(course.facultyId);
    setFacultySearch(course.facultyName);
    setTimetable(course.timetable && course.timetable.length > 0 ? course.timetable : [emptySlot()]);
    setSelectedCourseId(course._id);
  };

  const handleSaveCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!facultyId) {
      setStatus("Select an existing faculty or admin user.");
      return;
    }

    const parsedCredits = Number(credits);
    const parsedSemester = Number(semester);

    if (!Number.isFinite(parsedCredits) || !Number.isFinite(parsedSemester)) {
      setStatus("Credits and semester must be valid numbers.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        courseCode,
        title,
        credits: parsedCredits,
        facultyId,
        semester: parsedSemester,
        description: description.trim() || undefined,
        timetable: timetable.filter((slot) => slot.startTime.trim() && slot.endTime.trim()),
      };

      if (editingCourseId) {
        await updateCourse({ courseId: editingCourseId, ...payload });
        setStatus("Course updated.");
      } else {
        const result = await createCourse(payload);
        setSelectedCourseId(result.id);
        setStatus(result.created ? "Course created." : "Course updated.");
      }

      resetForm();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save course.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCourse = async (courseId: Id<"courses">) => {
    setBusy(true);
    setStatus(null);
    try {
      await deleteCourse({ courseId });
      if (selectedCourseId === courseId) {
        setSelectedCourseId(null);
      }
      resetForm();
      setStatus("Course deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete course.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedCourseId || !studentId || !selectedCourse) {
      setStatus("Select a course and an existing user.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      await enrollStudent({
        courseId: selectedCourseId,
        studentId,
        semester: selectedCourse.semester,
      });
      setStudentId("");
      setStudentSearch("");
      setStatus("Student enrolled.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to enroll student.");
    } finally {
      setBusy(false);
    }
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCourseId || !selectedCourse) {
      return;
    }

    setCsvStatus("Reading CSV...");
    try {
      const content = await file.text();
      const rollNumbers = parseCsvRollNumbers(content);
      const result = await bulkEnroll({
        courseId: selectedCourseId,
        rollNumbers,
        semester: selectedCourse.semester,
      });

      setCsvStatus(
        `Added ${result.added.length}. Already enrolled ${result.alreadyEnrolled.length}. Missing ${result.missing.length}. Not users ${result.notUsers.length}.`,
      );
    } catch (error) {
      setCsvStatus(error instanceof Error ? error.message : "CSV upload failed.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <section className="surface-card p-5 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-kicker">Course Management</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-white">Courses, rosters, faculty, and timetable</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-300">
            Add courses, assign existing faculty or admins, manage enrolled users, and publish weekly timetable slots.
          </p>
        </div>
        {editingCourseId ? (
          <SecondaryButton onClick={resetForm}>Cancel edit</SecondaryButton>
        ) : null}
      </header>

      {status ? <p className="mt-4 text-sm font-medium text-zinc-200">{status}</p> : null}

      <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.25fr]">
        <form onSubmit={handleSaveCourse} className="space-y-4 rounded-lg border border-white/15 bg-white/5 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FormInput label="Course code" value={courseCode} onChange={(event) => setCourseCode(event.target.value)} placeholder="CS301" />
            <FormInput label="Course title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Database Systems" />
            <FormInput label="Credits" type="number" min="1" value={credits} onChange={(event) => setCredits(event.target.value)} />
            <FormInput label="Semester" type="number" min="1" value={semester} onChange={(event) => setSemester(event.target.value)} />
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Course manager search</span>
            <input
              value={facultySearch}
              onChange={(event) => {
                setFacultySearch(event.target.value);
                setFacultyId("");
              }}
              placeholder="Search existing faculty or admin by name, email, department"
              className="h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
            />
          </label>
          <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
            {facultyRecommendations.map((faculty) => (
              <button
                key={faculty._id}
                type="button"
                onClick={() => {
                  setFacultyId(faculty._id);
                  setFacultySearch(faculty.fullName);
                }}
                className={`rounded-md border px-3 py-2 text-left text-xs transition ${facultyId === faculty._id ? "border-white/45 bg-white/18 text-white" : "border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
              >
                <span className="block truncate font-semibold">{faculty.fullName}</span>
                <span className="block truncate text-zinc-400">
                  {faculty.role} · {faculty.email ?? faculty.employeeId ?? "Existing user"}
                </span>
              </button>
            ))}
            {facultyRecommendations.length === 0 ? (
              <p className="text-xs text-zinc-400">No matching faculty or admin users.</p>
            ) : null}
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Weekly timetable</p>
              <SecondaryButton className="h-8 px-3 text-xs" onClick={() => setTimetable((current) => [...current, emptySlot()])}>
                Add slot
              </SecondaryButton>
            </div>
            {timetable.map((slot, index) => (
              <div key={`${slot.day}-${index}`} className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <select
                  value={slot.day}
                  onChange={(event) =>
                    setTimetable((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, day: event.target.value as DayName } : item,
                      ),
                    )
                  }
                  className="h-9 rounded-md border border-white/20 bg-white/10 px-2 text-sm text-white"
                >
                  {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
                <input type="time" value={slot.startTime} onChange={(event) => setTimetable((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item))} className="h-9 rounded-md border border-white/20 bg-white/5 px-2 text-sm text-white" />
                <input type="time" value={slot.endTime} onChange={(event) => setTimetable((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, endTime: event.target.value } : item))} className="h-9 rounded-md border border-white/20 bg-white/5 px-2 text-sm text-white" />
                <input value={slot.room ?? ""} onChange={(event) => setTimetable((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, room: event.target.value } : item))} placeholder="Room" className="h-9 rounded-md border border-white/20 bg-white/5 px-2 text-sm text-white" />
                <button type="button" onClick={() => setTimetable((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="h-9 rounded-md border border-white/20 px-3 text-xs font-semibold text-white disabled:opacity-50" disabled={timetable.length === 1}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <PrimaryButton className="w-full" type="submit" disabled={busy}>
            {busy ? "Saving..." : editingCourseId ? "Update course" : "Add course"}
          </PrimaryButton>
        </form>

        <div className="space-y-4">
          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              {courses === undefined ? "Loading courses" : `${courses.length} courses`}
            </p>
            <ul className="mt-3 max-h-112 space-y-3 overflow-y-auto pr-1">
              {(courses ?? []).map((course) => (
                <li key={course._id} className={`rounded-lg border p-4 ${selectedCourseId === course._id ? "border-white/35 bg-white/12" : "border-white/15 bg-black/20"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button type="button" onClick={() => setSelectedCourseId(course._id)} className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold text-white">{course.courseCode} · {course.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Faculty: {course.facultyName} · Semester {course.semester} · {course.enrolledCount} students · {course.resourceCount} files
                      </p>
                    </button>
                    <div className="flex gap-2">
                      <SecondaryButton className="h-8 px-3 text-xs" onClick={() => startEdit(course)}>Edit</SecondaryButton>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(course._id)}
                        disabled={busy}
                        className="h-8 rounded-md border border-white/20 px-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Course detail</p>
            {!selectedCourse ? (
              <p className="mt-3 text-sm text-zinc-400">Select a course to manage its roster and timetable.</p>
            ) : (
              <div className="mt-3 space-y-4">
                <div>
                  <h3 className="font-display text-xl font-semibold text-white">{selectedCourse.courseCode} · {selectedCourse.title}</h3>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {(selectedCourse.timetable ?? []).map((slot, index) => (
                      <p key={`${slot.day}-${slot.startTime}-${index}`} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                        <span className="font-semibold text-white">{slot.day}</span> {slot.startTime}-{slot.endTime}{slot.room ? ` · ${slot.room}` : ""}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Add user</span>
                    <input
                      value={studentSearch}
                      onChange={(event) => {
                        setStudentSearch(event.target.value);
                        setStudentId("");
                      }}
                      placeholder="Search existing users by name, email, roll number, employee ID"
                      className="h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                    />
                  </label>
                  <PrimaryButton className="self-end" onClick={handleAddStudent} disabled={busy || !studentId}>
                    Add User
                  </PrimaryButton>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {studentRecommendations.map((student) => (
                    <button
                      key={student._id}
                      type="button"
                      onClick={() => {
                        setStudentId(student._id);
                        setStudentSearch(student.fullName);
                      }}
                      className={`rounded-md border px-3 py-2 text-left text-xs transition ${studentId === student._id ? "border-white/45 bg-white/18 text-white" : "border-white/15 bg-black/20 text-zinc-300 hover:bg-white/10"
                        }`}
                    >
                      <span className="block truncate font-semibold">{student.fullName}</span>
                      <span className="block truncate text-zinc-400">
                        {student.role} · {student.enrollmentNumber ?? student.email ?? student.employeeId ?? "Existing user"}
                      </span>
                    </button>
                  ))}
                  {studentRecommendations.length === 0 ? (
                    <p className="text-xs text-zinc-400">No matching users available for this course.</p>
                  ) : null}
                </div>

                <label className="block rounded-lg border border-dashed border-white/20 bg-black/20 p-4">
                  <span className="block text-xs font-semibold uppercase tracking-widest text-zinc-400">Upload CSV</span>
                  <span className="mt-1 block text-xs text-zinc-400">CSV can contain roll numbers in one column or separated by commas.</span>
                  <input type="file" accept=".csv,text/csv,text/plain" onChange={handleCsvUpload} className="mt-3 block w-full text-sm text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/18" />
                  {csvStatus ? <span className="mt-2 block text-xs text-zinc-300">{csvStatus}</span> : null}
                </label>

                <ul className="space-y-2">
                  {roster === undefined ? (
                    <li className="text-sm text-zinc-400">Loading enrolled users...</li>
                  ) : roster.students.length === 0 ? (
                    <li className="text-sm text-zinc-400">No enrolled users yet.</li>
                  ) : (
                    roster.students.map((row) => (
                      <li key={row.enrollment._id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{row.student?.fullName}</p>
                          <p className="truncate text-xs text-zinc-400">{row.student?.enrollmentNumber ?? row.student?.email}</p>
                        </div>
                        <button
                          type="button"
                          disabled={busy || !row.student}
                          onClick={async () => {
                            if (!selectedCourseId || !row.student) return;
                            setBusy(true);
                            try {
                              await removeStudent({ courseId: selectedCourseId, studentId: row.student._id });
                              setStatus("Student removed.");
                            } catch (error) {
                              setStatus(error instanceof Error ? error.message : "Unable to remove student.");
                            } finally {
                              setBusy(false);
                            }
                          }}
                          className="h-8 rounded-md border border-white/20 px-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
