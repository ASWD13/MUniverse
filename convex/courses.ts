import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

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
