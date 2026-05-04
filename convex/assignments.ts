import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

async function requireCourseAccess(ctx: QueryCtx | MutationCtx, courseId: Id<"courses">) {
  const user = await requireUser(ctx);
  const course = await ctx.db.get(courseId);
  if (!course) throw new Error("Course not found");

  if (user.role === "admin" || course.facultyId === user._id) {
    return { user, course };
  }

  const enrollment = await ctx.db
    .query("enrollments")
    .withIndex("by_course_student", (q) => q.eq("courseId", courseId).eq("studentId", user._id))
    .first();

  if (!enrollment) {
    throw new Error("Forbidden");
  }

  return { user, course };
}

export const getAssignmentsByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    await requireCourseAccess(ctx, args.courseId);

    return await ctx.db
      .query("assignments")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .collect();
  },
});

export const getAssignmentsByFaculty = query({
  args: { facultyId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "admin" && user._id !== args.facultyId) {
      throw new Error("Forbidden");
    }

    return await ctx.db
      .query("assignments")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.facultyId))
      .collect();
  },
});

export const getMyAssignments = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
      .collect();

    const assignmentsPre = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await ctx.db.get(enrollment.courseId);
        const assigns = await ctx.db
          .query("assignments")
          .withIndex("by_courseId", (q) => q.eq("courseId", enrollment.courseId))
          .collect();

        return assigns.map(a => ({ ...a, course: course?.title || "Unknown", courseCode: course?.courseCode || "N/A" }));
      })
    );

    return assignmentsPre.flat().sort((a, b) => a.dueDate - b.dueDate);
  },
});

export const uploadAssignment = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    maxMarks: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "faculty" && user.role !== "admin") {
      throw new Error("Only faculty and admins can upload assignments");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    if (user.role !== "admin" && course.facultyId !== user._id) {
      throw new Error("You can only upload assignments to your courses");
    }

    if (!args.title.trim()) {
      throw new Error("Assignment title is required");
    }

    if (args.maxMarks <= 0) {
      throw new Error("Max marks must be greater than 0");
    }

    return await ctx.db.insert("assignments", {
      courseId: args.courseId,
      title: args.title,
      description: args.description,
      dueDate: args.dueDate,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      maxMarks: args.maxMarks,
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    maxMarks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "faculty" && user.role !== "admin") {
      throw new Error("Only faculty and admins can update assignments");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (user.role !== "admin" && assignment.createdBy !== user._id) {
      throw new Error("You can only update your own assignments");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.fileUrl !== undefined) updates.fileUrl = args.fileUrl;
    if (args.fileName !== undefined) updates.fileName = args.fileName;
    if (args.maxMarks !== undefined) updates.maxMarks = args.maxMarks;

    await ctx.db.patch(args.assignmentId, updates);
    return await ctx.db.get(args.assignmentId);
  },
});

export const deleteAssignment = mutation({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "faculty" && user.role !== "admin") {
      throw new Error("Only faculty and admins can delete assignments");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (user.role !== "admin" && assignment.createdBy !== user._id) {
      throw new Error("You can only delete your own assignments");
    }

    await ctx.db.delete(args.assignmentId);
  },
});

export const getSubmissionsByAssignment = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    await requireCourseAccess(ctx, assignment.courseId);

    const submissions = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_assignmentId", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    return await Promise.all(
      submissions.map(async (submission) => {
        const student = await ctx.db.get(submission.studentId);
        return {
          ...submission,
          student: student
            ? {
                _id: student._id,
                fullName: [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email || student.clerkId,
                email: student.email,
                enrollmentNumber: student.enrollmentNumber ?? null,
              }
            : null,
        };
      }),
    );
  },
});

export const getMySubmissions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
      .collect();
  },
});

export const submitAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileKey: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_course_student", (q) => q.eq("courseId", assignment.courseId).eq("studentId", user._id))
      .first();

    if (!enrollment) {
      throw new Error("You are not enrolled in this course");
    }

    const existing = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id),
      )
      .first();

    if (existing && !existing.allowResubmission) {
      throw new Error("Resubmission is not allowed for this assignment");
    }

    const isLate = Date.now() > assignment.dueDate;
    const submissionData = {
      assignmentId: args.assignmentId,
      courseId: assignment.courseId,
      studentId: user._id,
      enrollmentId: enrollment._id,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileKey: args.fileKey,
      note: args.note?.trim() || undefined,
      status: (isLate ? "late" : existing ? "resubmitted" : "submitted") as "late" | "resubmitted" | "submitted",
      allowResubmission: false,
      plagiarismFlag: false,
      submittedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, submissionData);
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("assignmentSubmissions", submissionData);
    return { id, created: true };
  },
});

export const reviewSubmission = mutation({
  args: {
    submissionId: v.id("assignmentSubmissions"),
    feedback: v.optional(v.string()),
    status: v.union(
      v.literal("reviewed"),
      v.literal("flagged"),
      v.literal("submitted"),
      v.literal("late"),
      v.literal("resubmitted"),
    ),
    allowResubmission: v.boolean(),
    plagiarismFlag: v.boolean(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");
    const { user } = await requireCourseAccess(ctx, submission.courseId);

    if (user.role !== "admin") {
      const course = await ctx.db.get(submission.courseId);
      if (!course || course.facultyId !== user._id) {
        throw new Error("Forbidden");
      }
    }

    await ctx.db.patch(args.submissionId, {
      feedback: args.feedback?.trim() || undefined,
      status: args.status,
      allowResubmission: args.allowResubmission,
      plagiarismFlag: args.plagiarismFlag,
      reviewedAt: Date.now(),
      reviewedBy: user._id,
    });

    return { success: true };
  },
});

export const upsertAssignmentForAdmin = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    maxMarks: v.number(),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    const createdBy = args.createdBy ?? course.facultyId;
    const faculty = await ctx.db.get(createdBy);
    if (!faculty || (faculty.role !== "faculty" && faculty.role !== "admin")) {
      throw new Error("createdBy must point to a faculty or admin user");
    }

    if (!args.title.trim()) {
      throw new Error("Assignment title is required");
    }

    if (args.maxMarks <= 0) {
      throw new Error("Max marks must be greater than 0");
    }

    const existing = (
      await ctx.db
        .query("assignments")
        .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
        .collect()
    ).find((assignment) => assignment.title.toLowerCase() === args.title.trim().toLowerCase());

    const assignmentData = {
      courseId: args.courseId,
      title: args.title.trim(),
      description: args.description,
      dueDate: args.dueDate,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      maxMarks: args.maxMarks,
      createdBy,
    };

    if (existing) {
      await ctx.db.patch(existing._id, assignmentData);
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("assignments", {
      ...assignmentData,
      createdAt: Date.now(),
    });

    return { id, created: true };
  },
});
