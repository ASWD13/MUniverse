import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

const userLookup = v.object({
  email: v.optional(v.string()),
  enrollmentNumber: v.optional(v.string()),
  employeeId: v.optional(v.string()),
});

const dateValue = v.union(v.number(), v.string());

const assessmentType = v.union(
  v.literal("assignment"),
  v.literal("midterm"),
  v.literal("final"),
  v.literal("project"),
  v.literal("quiz"),
);

async function findUser(ctx: MutationCtx, lookup: {
  email?: string;
  enrollmentNumber?: string;
  employeeId?: string;
}): Promise<Doc<"users">> {
  if (lookup.email) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", lookup.email as string))
      .first();
    if (user) return user;
  }

  if (lookup.enrollmentNumber) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_enrollmentNumber", (q) =>
        q.eq("enrollmentNumber", lookup.enrollmentNumber as string),
      )
      .first();
    if (user) return user;
  }

  if (lookup.employeeId) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_employeeId", (q) => q.eq("employeeId", lookup.employeeId as string))
      .first();
    if (user) return user;
  }

  throw new Error(
    `User not found for lookup ${JSON.stringify({
      email: lookup.email,
      enrollmentNumber: lookup.enrollmentNumber,
      employeeId: lookup.employeeId,
    })}`,
  );
}

function toTimestamp(value: number | string, fieldName: string): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a timestamp or ISO date string`);
  }

  return parsed;
}

async function findCourseByCode(ctx: MutationCtx, courseCode: string): Promise<Doc<"courses">> {
  const course = await ctx.db
    .query("courses")
    .withIndex("by_courseCode", (q) => q.eq("courseCode", courseCode.trim().toUpperCase()))
    .first();

  if (!course) {
    throw new Error(`Course not found: ${courseCode}`);
  }

  return course;
}

async function findEnrollment(
  ctx: MutationCtx,
  courseId: Id<"courses">,
  studentId: Id<"users">,
): Promise<Doc<"enrollments">> {
  const enrollment = await ctx.db
    .query("enrollments")
    .withIndex("by_course_student", (q) =>
      q.eq("courseId", courseId).eq("studentId", studentId),
    )
    .first();

  if (!enrollment) {
    throw new Error("Enrollment not found for course/student pair");
  }

  return enrollment;
}

export const seedAcademicData = mutation({
  args: {
    courses: v.array(
      v.object({
        courseCode: v.string(),
        title: v.string(),
        credits: v.number(),
        semester: v.number(),
        faculty: userLookup,
        departmentOwner: v.optional(userLookup),
        description: v.optional(v.string()),
      }),
    ),
    enrollments: v.array(
      v.object({
        courseCode: v.string(),
        student: userLookup,
        semester: v.number(),
        attendancePercentage: v.optional(v.number()),
      }),
    ),
    assignments: v.array(
      v.object({
        courseCode: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        dueDate: dateValue,
        fileUrl: v.optional(v.string()),
        fileName: v.optional(v.string()),
        maxMarks: v.number(),
        createdBy: v.optional(userLookup),
      }),
    ),
    grades: v.array(
      v.object({
        courseCode: v.string(),
        student: userLookup,
        mark: v.number(),
        maxMark: v.number(),
        assessmentType,
        feedback: v.optional(v.string()),
        faculty: v.optional(userLookup),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx);
    requireRole(currentUser, ["admin"]);

    const summary = {
      coursesCreated: 0,
      coursesUpdated: 0,
      enrollmentsCreated: 0,
      enrollmentsUpdated: 0,
      assignmentsCreated: 0,
      assignmentsUpdated: 0,
      gradesCreated: 0,
      gradesUpdated: 0,
    };

    for (const courseInput of args.courses) {
      const faculty = await findUser(ctx, courseInput.faculty);
      if (faculty.role !== "faculty") {
        throw new Error(`${faculty.email ?? faculty.clerkId} is not a faculty user`);
      }

      const departmentOwner = courseInput.departmentOwner
        ? await findUser(ctx, courseInput.departmentOwner)
        : faculty;
      const courseCode = courseInput.courseCode.trim().toUpperCase();

      const existing = await ctx.db
        .query("courses")
        .withIndex("by_courseCode", (q) => q.eq("courseCode", courseCode))
        .first();

      const courseData = {
        courseCode,
        title: courseInput.title.trim(),
        credits: courseInput.credits,
        departmentId: departmentOwner._id,
        facultyId: faculty._id,
        semester: courseInput.semester,
        description: courseInput.description,
      };

      if (existing) {
        await ctx.db.patch(existing._id, courseData);
        summary.coursesUpdated += 1;
      } else {
        await ctx.db.insert("courses", {
          ...courseData,
          createdAt: Date.now(),
        });
        summary.coursesCreated += 1;
      }
    }

    for (const enrollmentInput of args.enrollments) {
      const course = await findCourseByCode(ctx, enrollmentInput.courseCode);
      const student = await findUser(ctx, enrollmentInput.student);
      if (student.role !== "student") {
        throw new Error(`${student.email ?? student.clerkId} is not a student user`);
      }

      const existing = await ctx.db
        .query("enrollments")
        .withIndex("by_course_student", (q) =>
          q.eq("courseId", course._id).eq("studentId", student._id),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          semester: enrollmentInput.semester,
          attendancePercentage: enrollmentInput.attendancePercentage,
        });
        summary.enrollmentsUpdated += 1;
      } else {
        await ctx.db.insert("enrollments", {
          courseId: course._id,
          studentId: student._id,
          semester: enrollmentInput.semester,
          attendancePercentage: enrollmentInput.attendancePercentage,
          enrolledAt: Date.now(),
        });
        summary.enrollmentsCreated += 1;
      }
    }

    for (const assignmentInput of args.assignments) {
      const course = await findCourseByCode(ctx, assignmentInput.courseCode);
      const createdBy = assignmentInput.createdBy
        ? await findUser(ctx, assignmentInput.createdBy)
        : await ctx.db.get(course.facultyId);

      if (!createdBy || createdBy.role !== "faculty") {
        throw new Error(`Assignment creator for ${assignmentInput.title} must be faculty`);
      }

      const existing = (
        await ctx.db
          .query("assignments")
          .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
          .collect()
      ).find(
        (assignment) =>
          assignment.title.trim().toLowerCase() === assignmentInput.title.trim().toLowerCase(),
      );

      const assignmentData = {
        courseId: course._id,
        title: assignmentInput.title.trim(),
        description: assignmentInput.description,
        dueDate: toTimestamp(assignmentInput.dueDate, "assignment.dueDate"),
        fileUrl: assignmentInput.fileUrl,
        fileName: assignmentInput.fileName,
        maxMarks: assignmentInput.maxMarks,
        createdBy: createdBy._id,
      };

      if (existing) {
        await ctx.db.patch(existing._id, assignmentData);
        summary.assignmentsUpdated += 1;
      } else {
        await ctx.db.insert("assignments", {
          ...assignmentData,
          createdAt: Date.now(),
        });
        summary.assignmentsCreated += 1;
      }
    }

    for (const gradeInput of args.grades) {
      const course = await findCourseByCode(ctx, gradeInput.courseCode);
      const student = await findUser(ctx, gradeInput.student);
      const enrollment = await findEnrollment(ctx, course._id, student._id);
      const faculty = gradeInput.faculty ? await findUser(ctx, gradeInput.faculty) : await ctx.db.get(course.facultyId);

      if (!faculty || faculty.role !== "faculty") {
        throw new Error(`Grade faculty for ${gradeInput.courseCode} must be faculty`);
      }

      if (gradeInput.mark > gradeInput.maxMark) {
        throw new Error(`Grade mark cannot exceed maxMark for ${gradeInput.courseCode}`);
      }

      const existing = (
        await ctx.db
          .query("grades")
          .withIndex("by_enrollmentId", (q) => q.eq("enrollmentId", enrollment._id))
          .collect()
      ).find((grade) => grade.assessmentType === gradeInput.assessmentType);

      const gradeData = {
        enrollmentId: enrollment._id,
        mark: gradeInput.mark,
        maxMark: gradeInput.maxMark,
        assessmentType: gradeInput.assessmentType,
        feedback: gradeInput.feedback,
        facultyId: faculty._id,
        postedAt: Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, gradeData);
        summary.gradesUpdated += 1;
      } else {
        await ctx.db.insert("grades", gradeData);
        summary.gradesCreated += 1;
      }
    }

    return { success: true, summary };
  },
});
