import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

async function requireAdminOrAssignedFaculty(ctx: QueryCtx | MutationCtx, courseId: Id<"courses">) {
  const user = await requireUser(ctx);
  const course = await ctx.db.get(courseId);

  if (!course) {
    throw new Error("Course not found");
  }

  if (user.role !== "admin" && !(user.role === "faculty" && course.facultyId === user._id)) {
    throw new Error("Forbidden");
  }

  return { user, course };
}

export const getEnrollmentsByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    await requireAdminOrAssignedFaculty(ctx, args.courseId);

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .collect();

    // Fetch student details for each enrollment
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const student = await ctx.db.get(enrollment.studentId);
        return {
          ...enrollment,
          student: student,
        };
      })
    );

    return enrichedEnrollments;
  },
});

export const getCourseRoster = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const { course } = await requireAdminOrAssignedFaculty(ctx, args.courseId);

    const [faculty, enrollments] = await Promise.all([
      ctx.db.get(course.facultyId),
      ctx.db
        .query("enrollments")
        .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
        .collect(),
    ]);

    const students = await Promise.all(
      enrollments.map(async (enrollment) => {
        const student = await ctx.db.get(enrollment.studentId);
        return {
          enrollment,
          student: student
            ? {
                _id: student._id,
                fullName: [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email || student.clerkId,
                role: student.role,
                email: student.email,
                enrollmentNumber: student.enrollmentNumber ?? null,
                employeeId: student.employeeId ?? null,
                department: student.department ?? null,
              }
            : null,
        };
      }),
    );

    return {
      course,
      faculty: faculty
        ? {
            _id: faculty._id,
            fullName: [faculty.firstName, faculty.lastName].filter(Boolean).join(" ") || faculty.email || faculty.clerkId,
            email: faculty.email,
          }
        : null,
      students: students
        .filter((row) => row.student !== null)
        .sort((left, right) =>
          (left.student?.enrollmentNumber ?? left.student?.fullName ?? "").localeCompare(
            right.student?.enrollmentNumber ?? right.student?.fullName ?? "",
          ),
        ),
    };
  },
});

export const getStudentEnrollments = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_studentId", (q) => q.eq("studentId", args.studentId))
      .collect();

    // Fetch course details for each enrollment
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        return {
          ...enrollment,
          course: course,
        };
      })
    );

    return enrichedEnrollments;
  },
});

export const getMyAttendance = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
      .collect();

    const result = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        return {
          course: course?.title || "Unknown Course",
          courseCode: course?.courseCode || "",
          percentage: enrollment.attendancePercentage || 0,
          threshold: 75,
        };
      })
    );

    return result;
  },
});

export const enrollStudent = mutation({
  args: {
    courseId: v.id("courses"),
    studentId: v.id("users"),
    semester: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new Error("studentId must point to an existing user");
    }

    // Check if enrollment already exists
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", args.studentId)
      )
      .first();

    if (existing) {
      throw new Error("User is already enrolled in this course");
    }

    return await ctx.db.insert("enrollments", {
      ...args,
      enrolledAt: Date.now(),
    });
  },
});

export const updateAttendance = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    attendancePercentage: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "faculty" && user.role !== "admin") {
      throw new Error("Only faculty and admins can update attendance");
    }

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    const course = await ctx.db.get(enrollment.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    if (user.role !== "admin" && course.facultyId !== user._id) {
      throw new Error("You can only update attendance for your courses");
    }

    await ctx.db.patch(args.enrollmentId, {
      attendancePercentage: args.attendancePercentage,
    });

    return await ctx.db.get(args.enrollmentId);
  },
});

export const getMyEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
      .collect();

    return await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        return {
          ...enrollment,
          course,
        };
      })
    );
  },
});

export const upsertEnrollmentForAdmin = mutation({
  args: {
    courseId: v.id("courses"),
    studentId: v.id("users"),
    semester: v.number(),
    attendancePercentage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new Error("studentId must point to an existing user");
    }

    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", args.studentId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        semester: args.semester,
        attendancePercentage: args.attendancePercentage,
      });
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("enrollments", {
      courseId: args.courseId,
      studentId: args.studentId,
      semester: args.semester,
      attendancePercentage: args.attendancePercentage,
      enrolledAt: Date.now(),
    });

    return { id, created: true };
  },
});

export const removeStudentFromCourse = mutation({
  args: {
    courseId: v.id("courses"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", args.studentId)
      )
      .first();

    if (!existing) {
      throw new Error("Enrollment not found");
    }

    await ctx.db.delete(existing._id);
    return { success: true };
  },
});

export const bulkEnrollByRollNumbers = mutation({
  args: {
    courseId: v.id("courses"),
    rollNumbers: v.array(v.string()),
    semester: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    const normalizedRolls = Array.from(
      new Set(
        args.rollNumbers
          .map((roll) => roll.trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    const result = {
      added: [] as string[],
      alreadyEnrolled: [] as string[],
      missing: [] as string[],
      notUsers: [] as string[],
    };

    for (const roll of normalizedRolls) {
      const student = await ctx.db
        .query("users")
        .withIndex("by_enrollmentNumber", (q) => q.eq("enrollmentNumber", roll))
        .first();

      if (!student) {
        result.missing.push(roll);
        continue;
      }

      const existing = await ctx.db
        .query("enrollments")
        .withIndex("by_course_student", (q) =>
          q.eq("courseId", args.courseId).eq("studentId", student._id),
        )
        .first();

      if (existing) {
        result.alreadyEnrolled.push(roll);
        continue;
      }

      await ctx.db.insert("enrollments", {
        courseId: args.courseId,
        studentId: student._id,
        semester: args.semester,
        enrolledAt: Date.now(),
      });
      result.added.push(roll);
    }

    return result;
  },
});
