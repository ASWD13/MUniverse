import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const getEnrollmentsByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
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
    if (user.role !== "student" && user.role !== "admin") {
      throw new Error("Only students or admins can view attendance this way");
    }

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
    
    // Check if user is faculty or admin
    if (user.role !== "faculty" && user.role !== "admin") {
      throw new Error("Only faculty and admins can enroll students");
    }

    // Check if enrollment already exists
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", args.studentId)
      )
      .first();

    if (existing) {
      throw new Error("Student is already enrolled in this course");
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
    if (user.role !== "faculty") {
      throw new Error("Only faculty can update attendance");
    }

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    await ctx.db.patch(args.enrollmentId, {
      attendancePercentage: args.attendancePercentage,
    });

    return await ctx.db.get(args.enrollmentId);
  },
});
