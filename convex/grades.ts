import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

const assessmentTypeValidator = v.union(
  v.literal("assignment"),
  v.literal("midterm"),
  v.literal("final"),
  v.literal("project"),
  v.literal("quiz")
);

export const getGradesByEnrollment = query({
  args: { enrollmentId: v.id("enrollments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("grades")
      .withIndex("by_enrollmentId", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();
  },
});

export const getGradesByStudent = query({
  args: { studentId: v.id("users"), courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", args.studentId)
      )
      .first();

    if (!enrollment) {
      return [];
    }

    return await ctx.db
      .query("grades")
      .withIndex("by_enrollmentId", (q) => q.eq("enrollmentId", enrollment._id))
      .collect();
  },
});

export const getMyGrades = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
      .collect();

    const data = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        const grades = await ctx.db
          .query("grades")
          .withIndex("by_enrollmentId", (q) => q.eq("enrollmentId", enrollment._id))
          .collect();
        return { course, enrollment, grades };
      })
    );
    return data;
  },
});

export const postMark = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    mark: v.number(),
    maxMark: v.number(),
    assessmentType: assessmentTypeValidator,
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "faculty" && user.role !== "admin") {
      throw new Error("Only faculty and admins can post marks");
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
      throw new Error("You can only post marks for your courses");
    }

    // Validate mark is not greater than maxMark
    if (args.mark > args.maxMark) {
      throw new Error("Mark cannot be greater than max mark");
    }

    return await ctx.db.insert("grades", {
      enrollmentId: args.enrollmentId,
      mark: args.mark,
      maxMark: args.maxMark,
      assessmentType: args.assessmentType,
      feedback: args.feedback || undefined,
      postedAt: Date.now(),
      facultyId: user._id,
    });
  },
});

export const updateMark = mutation({
  args: {
    gradeId: v.id("grades"),
    mark: v.number(),
    maxMark: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "faculty" && user.role !== "admin") {
      throw new Error("Only faculty and admins can update marks");
    }

    const grade = await ctx.db.get(args.gradeId);
    if (!grade) {
      throw new Error("Grade not found");
    }

    if (user.role !== "admin" && grade.facultyId !== user._id) {
      throw new Error("You can only update marks you posted");
    }

    if (args.mark > args.maxMark) {
      throw new Error("Mark cannot be greater than max mark");
    }

    await ctx.db.patch(args.gradeId, {
      mark: args.mark,
      maxMark: args.maxMark,
      feedback: args.feedback,
    });

    return await ctx.db.get(args.gradeId);
  },
});

export const getClassGrades = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .collect();

    const gradesData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const student = await ctx.db.get(enrollment.studentId);
        const grades = await ctx.db
          .query("grades")
          .withIndex("by_enrollmentId", (q) => q.eq("enrollmentId", enrollment._id))
          .collect();

        return {
          enrollment,
          student,
          grades,
        };
      })
    );

    return gradesData;
  },
});

export const upsertGradeForAdmin = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    mark: v.number(),
    maxMark: v.number(),
    assessmentType: assessmentTypeValidator,
    feedback: v.optional(v.string()),
    facultyId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    const course = await ctx.db.get(enrollment.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    const facultyId = args.facultyId ?? course.facultyId;
    const faculty = await ctx.db.get(facultyId);
    if (!faculty || (faculty.role !== "faculty" && faculty.role !== "admin")) {
      throw new Error("facultyId must point to a faculty or admin user");
    }

    if (args.mark > args.maxMark) {
      throw new Error("Mark cannot be greater than max mark");
    }

    const existing = (
      await ctx.db
        .query("grades")
        .withIndex("by_enrollmentId", (q) => q.eq("enrollmentId", args.enrollmentId))
        .collect()
    ).find((grade) => grade.assessmentType === args.assessmentType);

    const gradeData = {
      enrollmentId: args.enrollmentId,
      mark: args.mark,
      maxMark: args.maxMark,
      assessmentType: args.assessmentType,
      feedback: args.feedback,
      facultyId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...gradeData,
        postedAt: Date.now(),
      });
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("grades", {
      ...gradeData,
      postedAt: Date.now(),
    });

    return { id, created: true };
  },
});
