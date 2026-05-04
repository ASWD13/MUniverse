import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";
import { UTApi } from "uploadthing/server";
import { refreshSessionInternal } from "./sessions";

async function requireCourseFileManager(ctx: QueryCtx | MutationCtx, courseId: Id<"courses">) {
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

async function upsertFileRecord(
    ctx: MutationCtx,
    args: {
        fileKey?: string;
        url: string;
        clerkId: string;
        uploadedByUserId?: Id<"users">;
        courseId?: Id<"courses">;
        resourceGroupId?: string;
        title?: string;
        description?: string;
        name?: string;
        size?: number;
    },
) {
    const existingByUrl = await ctx.db
        .query("files")
                .withIndex("by_url", (q) => q.eq("url", args.url))
        .unique();

    if (existingByUrl) {
        await ctx.db.patch(existingByUrl._id, {
            fileKey: args.fileKey ?? existingByUrl.fileKey,
            clerkId: args.clerkId,
            uploadedByUserId: args.uploadedByUserId ?? existingByUrl.uploadedByUserId,
            courseId: args.courseId ?? existingByUrl.courseId,
            resourceGroupId: args.resourceGroupId ?? existingByUrl.resourceGroupId,
            title: args.title ?? existingByUrl.title,
            description: args.description ?? existingByUrl.description,
            name: args.name ?? existingByUrl.name,
            size: args.size ?? existingByUrl.size,
            uploadedAt: Date.now(),
        });

        return { success: true, id: existingByUrl._id, duplicate: true };
    }

    const insertedId = await ctx.db.insert("files", {
        fileKey: args.fileKey ?? undefined,
        url: args.url,
        clerkId: args.clerkId,
        uploadedByUserId: args.uploadedByUserId,
        courseId: args.courseId,
        resourceGroupId: args.resourceGroupId,
        title: args.title,
        description: args.description,
        name: args.name ?? undefined,
        size: args.size ?? undefined,
        uploadedAt: Date.now(),
    });

    return { success: true, id: insertedId, duplicate: false };
}

export const storeFileForCurrentUser = mutation({
    args: {
        fileKey: v.optional(v.string()),
        url: v.string(),
        name: v.optional(v.string()),
        size: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        return upsertFileRecord(ctx, {
            fileKey: args.fileKey,
            url: args.url,
            clerkId: identity.subject,
            name: args.name,
            size: args.size,
        });
    },
});

export const storeCourseFile = mutation({
    args: {
        courseId: v.id("courses"),
        resourceGroupId: v.optional(v.string()),
        fileKey: v.optional(v.string()),
        url: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        name: v.optional(v.string()),
        size: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { user } = await requireCourseFileManager(ctx, args.courseId);

        const title = args.title.trim() || args.name?.trim() || "Course resource";
        const url = args.url.trim();

        if (!url) {
            throw new Error("File URL is required");
        }

        return upsertFileRecord(ctx, {
            fileKey: args.fileKey,
            url,
            clerkId: user.clerkId,
            uploadedByUserId: user._id,
            courseId: args.courseId,
            resourceGroupId: args.resourceGroupId?.trim() || undefined,
            title,
            description: args.description?.trim() || undefined,
            name: args.name,
            size: args.size,
        });
    },
});

export const storeFileFromUploadthing = internalMutation({
    args: {
        fileKey: v.optional(v.string()),
        url: v.string(),
        clerkId: v.string(),
        name: v.optional(v.string()),
        size: v.optional(v.number()),
    },
    handler: async (ctx, args) =>
        upsertFileRecord(ctx, {
            fileKey: args.fileKey,
            url: args.url,
            clerkId: args.clerkId,
            name: args.name,
            size: args.size,
        }),
});

export const getCurrentUserFiles = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const rows = await ctx.db
            .query("files")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .collect();

        return rows.map((r) => ({
            _id: r._id,
            fileKey: r.fileKey ?? undefined,
            url: r.url,
            clerkId: r.clerkId,
            courseId: r.courseId ?? undefined,
            resourceGroupId: r.resourceGroupId ?? undefined,
            title: r.title ?? undefined,
            description: r.description ?? undefined,
            name: r.name ?? undefined,
            size: r.size ?? undefined,
            uploadedAt: r.uploadedAt ?? undefined,
        }));
    },
});

export const getManagedCourseFiles = query({
    args: {
        courseId: v.optional(v.id("courses")),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        let files: Doc<"files">[] = [];

        if (args.courseId) {
            await requireCourseFileManager(ctx, args.courseId);
            files = await ctx.db
                .query("files")
                .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
                .collect();
        } else if (user.role === "admin") {
            files = await ctx.db.query("files").collect();
        } else if (user.role === "faculty") {
            const courses = await ctx.db
                .query("courses")
                .withIndex("by_facultyId", (q) => q.eq("facultyId", user._id))
                .collect();
            const courseIds = new Set(courses.map((course) => course._id));
            files = (await ctx.db.query("files").collect()).filter(
                (file) => file.courseId && courseIds.has(file.courseId),
            );
        } else {
            throw new Error("Forbidden");
        }

        const courses = await Promise.all(files.map((file) => file.courseId ? ctx.db.get(file.courseId) : null));
        const uploaders = await Promise.all(files.map((file) => file.uploadedByUserId ? ctx.db.get(file.uploadedByUserId) : null));

        return files
            .map((file, index) => ({
                ...file,
                title: file.title ?? file.name ?? "Course resource",
                course: courses[index]
                    ? {
                        _id: courses[index]!._id,
                        courseCode: courses[index]!.courseCode,
                        title: courses[index]!.title,
                    }
                    : null,
                uploadedByName: uploaders[index]
                    ? [uploaders[index]!.firstName, uploaders[index]!.lastName].filter(Boolean).join(" ") ||
                        uploaders[index]!.email ||
                        uploaders[index]!.clerkId
                    : file.clerkId,
            }))
            .sort((left, right) => right.uploadedAt - left.uploadedAt);
    },
});

export const getMyCourseFiles = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx);

        const enrollments = await ctx.db
            .query("enrollments")
            .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
            .collect();

        const rows = await Promise.all(
            enrollments.map(async (enrollment) => {
                const [course, files] = await Promise.all([
                    ctx.db.get(enrollment.courseId),
                    ctx.db
                        .query("files")
                        .withIndex("by_courseId", (q) => q.eq("courseId", enrollment.courseId))
                        .collect(),
                ]);

                return files.map((file) => ({
                    ...file,
                    title: file.title ?? file.name ?? "Course resource",
                    course: course
                        ? {
                            _id: course._id,
                            courseCode: course.courseCode,
                            title: course.title,
                        }
                        : null,
                }));
            }),
        );

        return rows.flat().sort((left, right) => right.uploadedAt - left.uploadedAt);
    },
});

export const deleteCourseFile = mutation({
    args: {
        fileId: v.id("files"),
    },
    handler: async (ctx, args) => {
        const file = await ctx.db.get(args.fileId);
        if (!file) {
            throw new Error("File not found");
        }

        if (!file.courseId) {
            const user = await requireUser(ctx);
            requireRole(user, ["admin"]);
        } else {
            await requireCourseFileManager(ctx, file.courseId);
        }

        if (file.fileKey) {
            await ctx.scheduler.runAfter(0, internal.files.deleteUploadthingFiles, {
                fileKeys: [file.fileKey],
            });
        }

        await ctx.db.delete(args.fileId);
        return { success: true };
    },
});

export const deleteUploadthingFiles = internalAction({
    args: {
        fileKeys: v.array(v.string()),
    },
    handler: async (_ctx, args) => {
        const fileKeys = Array.from(new Set(args.fileKeys.filter(Boolean)));
        if (fileKeys.length === 0) {
            return { success: true, deleted: 0 };
        }

        try {
            const utapi = new UTApi();
            await utapi.deleteFiles(fileKeys);
            return { success: true, deleted: fileKeys.length };
        } catch (error) {
            console.error("Failed to delete UploadThing files", error);
            return { success: false, deleted: 0 };
        }
    },
});

export const logResourceAccess = mutation({
    args: {
        fileId: v.optional(v.id("files")),
        url: v.optional(v.string()),
        fileName: v.optional(v.string()),
        accessType: v.union(v.literal("view"), v.literal("download")),
        latencyMs: v.optional(v.number()),
        userAgent: v.optional(v.string()),
        referrer: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        let file = args.fileId ? await ctx.db.get(args.fileId) : null;
        if (!file && args.url) {
            file = await ctx.db
                .query("files")
                .withIndex("by_url", (q) => q.eq("url", args.url as string))
                .first();
        }

        if (!file && !args.url && !args.fileName) {
            throw new Error("fileId, url, or fileName is required");
        }

        const id = await ctx.db.insert("resourceAccessLogs", {
            fileId: file?._id,
            url: file?.url ?? args.url,
            fileName: file?.name ?? args.fileName,
            userId: user._id,
            clerkId: user.clerkId,
            accessType: args.accessType,
            latencyMs: args.latencyMs,
            accessedAt: Date.now(),
            userAgent: args.userAgent,
            referrer: args.referrer,
        });

        await refreshSessionInternal(ctx, user._id, user.clerkId, args.userAgent);

        return { success: true, id };
    },
});

export const getResourceAccessStats = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx);
        requireRole(user, ["admin"]);

        const [files, logs] = await Promise.all([
            ctx.db.query("files").collect(),
            ctx.db.query("resourceAccessLogs").collect(),
        ]);

        const fileById = new Map(files.map((file) => [file._id, file]));
        const statsByResource = new Map<
            string,
            {
                fileId?: string;
                url?: string;
                fileName: string;
                views: number;
                downloads: number;
                total: number;
                lastAccessedAt: number | null;
            }
        >();

        for (const log of logs) {
            const file = log.fileId ? fileById.get(log.fileId) : null;
            const key = file?.resourceGroupId ?? log.fileId ?? log.url ?? "unknown-resource";
            const existing = statsByResource.get(key) ?? {
                fileId: log.fileId,
                url: file?.url ?? log.url,
                fileName: file?.name ?? log.fileName ?? file?.url ?? log.url ?? "Unknown resource",
                views: 0,
                downloads: 0,
                total: 0,
                lastAccessedAt: null,
            };

            if (log.accessType === "download") {
                existing.downloads += 1;
            } else {
                existing.views += 1;
            }
            existing.total += 1;
            existing.lastAccessedAt = Math.max(existing.lastAccessedAt ?? 0, log.accessedAt);
            statsByResource.set(key, existing);
        }

        return {
            totalAccesses: logs.length,
            totalViews: logs.filter((log) => log.accessType === "view").length,
            totalDownloads: logs.filter((log) => log.accessType === "download").length,
            uniqueResourcesAccessed: statsByResource.size,
            perResource: Array.from(statsByResource.values()).sort((left, right) => {
                if (right.total !== left.total) return right.total - left.total;
                return (right.lastAccessedAt ?? 0) - (left.lastAccessedAt ?? 0);
            }),
        };
    },
});
