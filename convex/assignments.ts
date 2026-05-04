import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

export const getAssignmentsByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .collect();
  },
});

export const getAssignmentsByFaculty = query({
  args: { facultyId: v.id("users") },
  handler: async (ctx, args) => {
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
