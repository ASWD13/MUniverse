import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

export const getCoursesByFaculty = query({
  args: { facultyId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("courses")
      .withIndex("by_facultyId", (q) => q.eq("facultyId", args.facultyId))
      .collect();
  },
});

export const getCourseById = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.courseId);
  },
});

export const createCourse = mutation({
  args: {
    courseCode: v.string(),
    title: v.string(),
    credits: v.number(),
    departmentId: v.id("users"),
    semester: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "faculty") {
      throw new Error("Only faculty can create courses");
    }

    return await ctx.db.insert("courses", {
      ...args,
      facultyId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const upsertCourseForAdmin = mutation({
  args: {
    courseCode: v.string(),
    title: v.string(),
    credits: v.number(),
    departmentId: v.optional(v.id("users")),
    facultyId: v.id("users"),
    semester: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const faculty = await ctx.db.get(args.facultyId);
    if (!faculty || faculty.role !== "faculty") {
      throw new Error("facultyId must point to a faculty user");
    }

    if (args.departmentId) {
      const departmentOwner = await ctx.db.get(args.departmentId);
      if (!departmentOwner) {
        throw new Error("departmentId user not found");
      }
    }

    const courseCode = args.courseCode.trim().toUpperCase();
    if (!courseCode) {
      throw new Error("Course code is required");
    }

    const existing = await ctx.db
      .query("courses")
      .withIndex("by_courseCode", (q) => q.eq("courseCode", courseCode))
      .first();

    const courseData = {
      courseCode,
      title: args.title.trim(),
      credits: args.credits,
      departmentId: args.departmentId ?? args.facultyId,
      facultyId: args.facultyId,
      semester: args.semester,
      description: args.description,
    };

    if (existing) {
      await ctx.db.patch(existing._id, courseData);
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("courses", {
      ...courseData,
      createdAt: Date.now(),
    });

    return { id, created: true };
  },
});
