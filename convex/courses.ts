import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

const timetableSlotValue = v.object({
  day: v.union(
    v.literal("Monday"),
    v.literal("Tuesday"),
    v.literal("Wednesday"),
    v.literal("Thursday"),
    v.literal("Friday"),
    v.literal("Saturday"),
    v.literal("Sunday"),
  ),
  startTime: v.string(),
  endTime: v.string(),
  room: v.optional(v.string()),
  label: v.optional(v.string()),
});

async function assertCourseManagerUser(ctx: MutationCtx, facultyId: Id<"users">) {
  const faculty = await ctx.db.get(facultyId);
  if (!faculty || (faculty.role !== "faculty" && faculty.role !== "admin")) {
    throw new Error("facultyId must point to a faculty or admin user");
  }
  return faculty;
}

function normalizeCourseInput(args: {
  courseCode: string;
  title: string;
  credits: number;
  semester: number;
  description?: string;
  timetable?: Array<{
    day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
    startTime: string;
    endTime: string;
    room?: string;
    label?: string;
  }>;
}) {
  const courseCode = args.courseCode.trim().toUpperCase();
  const title = args.title.trim();

  if (!courseCode) {
    throw new Error("Course code is required");
  }

  if (!title) {
    throw new Error("Course title is required");
  }

  if (args.credits <= 0) {
    throw new Error("Credits must be greater than 0");
  }

  if (args.semester <= 0) {
    throw new Error("Semester must be greater than 0");
  }

  const timetable = (args.timetable ?? [])
    .map((slot) => ({
      day: slot.day,
      startTime: slot.startTime.trim(),
      endTime: slot.endTime.trim(),
      room: slot.room?.trim() || undefined,
      label: slot.label?.trim() || undefined,
    }))
    .filter((slot) => slot.startTime && slot.endTime);

  return {
    courseCode,
    title,
    credits: args.credits,
    semester: args.semester,
    description: args.description?.trim() || undefined,
    timetable,
  };
}

export const getCoursesByFaculty = query({
  args: { facultyId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("courses")
      .withIndex("by_facultyId", (q) => q.eq("facultyId", args.facultyId))
      .collect();
  },
});

export const getMyManagedCourses = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    if (user.role === "admin") {
      return await ctx.db.query("courses").collect();
    }

    if (user.role !== "faculty") {
      throw new Error("Only faculty and admins can manage courses");
    }

    return await ctx.db
      .query("courses")
      .withIndex("by_facultyId", (q) => q.eq("facultyId", user._id))
      .collect();
  },
});

export const listCoursesForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const courses = await ctx.db.query("courses").collect();

    return await Promise.all(
      courses
        .sort((left, right) => (right.updatedAt ?? right.createdAt) - (left.updatedAt ?? left.createdAt))
        .map(async (course) => {
          const [faculty, enrollments, files] = await Promise.all([
            ctx.db.get(course.facultyId),
            ctx.db
              .query("enrollments")
              .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
              .collect(),
            ctx.db
              .query("files")
              .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
              .collect(),
          ]);

          const facultyName = faculty
            ? [faculty.firstName, faculty.lastName].filter(Boolean).join(" ") || faculty.email || faculty.clerkId
            : "Unassigned";

          return {
            ...course,
            facultyName,
            enrolledCount: enrollments.length,
            resourceCount: files.length,
          };
        }),
    );
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
    timetable: v.optional(v.array(timetableSlotValue)),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "faculty") {
      throw new Error("Only faculty can create courses");
    }

    return await ctx.db.insert("courses", {
      ...normalizeCourseInput(args),
      departmentId: args.departmentId,
      facultyId: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
    timetable: v.optional(v.array(timetableSlotValue)),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    await assertCourseManagerUser(ctx, args.facultyId);

    if (args.departmentId) {
      const departmentOwner = await ctx.db.get(args.departmentId);
      if (!departmentOwner) {
        throw new Error("departmentId user not found");
      }
    }

    const normalized = normalizeCourseInput(args);

    const existing = await ctx.db
      .query("courses")
      .withIndex("by_courseCode", (q) => q.eq("courseCode", normalized.courseCode))
      .first();

    const courseData = {
      ...normalized,
      departmentId: args.departmentId ?? args.facultyId,
      facultyId: args.facultyId,
      updatedAt: Date.now(),
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

export const updateCourseForAdmin = mutation({
  args: {
    courseId: v.id("courses"),
    courseCode: v.string(),
    title: v.string(),
    credits: v.number(),
    departmentId: v.optional(v.id("users")),
    facultyId: v.id("users"),
    semester: v.number(),
    description: v.optional(v.string()),
    timetable: v.optional(v.array(timetableSlotValue)),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const existing = await ctx.db.get(args.courseId);
    if (!existing) {
      throw new Error("Course not found");
    }

    await assertCourseManagerUser(ctx, args.facultyId);

    const normalized = normalizeCourseInput(args);
    const duplicate = await ctx.db
      .query("courses")
      .withIndex("by_courseCode", (q) => q.eq("courseCode", normalized.courseCode))
      .first();

    if (duplicate && duplicate._id !== args.courseId) {
      throw new Error("Another course already uses this code");
    }

    await ctx.db.patch(args.courseId, {
      ...normalized,
      departmentId: args.departmentId ?? args.facultyId,
      facultyId: args.facultyId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteCourseForAdmin = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    const [enrollments, assignments, files] = await Promise.all([
      ctx.db
        .query("enrollments")
        .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
        .collect(),
      ctx.db
        .query("assignments")
        .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
        .collect(),
    ]);

    for (const enrollment of enrollments) {
      await ctx.db.delete(enrollment._id);
    }

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    await ctx.db.delete(args.courseId);
    return { success: true };
  },
});
