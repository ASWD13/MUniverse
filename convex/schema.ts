import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),

        firstName: v.union(v.string(), v.null()),
        lastName: v.union(v.string(), v.null()),
        email: v.union(v.string(), v.null()),

        role: v.union(
            v.literal("student"),
            v.literal("faculty"),
            v.literal("admin")
        ),

        department: v.optional(v.string()),
        enrollmentNumber: v.optional(v.string()),
        employeeId: v.optional(v.string()),

        updatedAt: v.optional(v.number()),

        preferences: v.optional(v.object({
            emailNotifications: v.boolean(),
        })),
    }).index("by_clerk_id", ["clerkId"])
        .index("by_email", ["email"])
        .index("by_department", ["department"])
        .index("by_enrollmentNumber", ["enrollmentNumber"])
        .index("by_employeeId", ["employeeId"]),

    announcements: defineTable({
        title: v.string(),
        content: v.string(),
        authorId: v.id("users"),
        targetRoles: v.array(
            v.union(
                v.literal("student"),
                v.literal("faculty"),
                v.literal("admin")
            )
        ),
        updatedAt: v.number(),
    })
        .index("by_authorId", ["authorId"])
        .index("by_updatedAt", ["updatedAt"]),

    notifications: defineTable({
        userId: v.id("users"),
        type: v.union(
            v.literal("general"),
            v.literal("announcement"),
            v.literal("event")
        ),
        content: v.string(),
        isRead: v.boolean(),
        relatedId: v.optional(v.id("announcements")),
    })
        .index("by_userId", ["userId"])
        .index("by_type", ["type"])
        .index("by_user_unread", ["userId", "isRead"]),

    announcementReads: defineTable({
        userId: v.id("users"),
        announcementId: v.id("announcements"),
        readAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_announcement", ["announcementId"])
        .index("by_user_announcement", ["userId", "announcementId"]),

    files: defineTable({
        fileKey: v.optional(v.string()),
        url: v.string(),
        clerkId: v.string(),
        name: v.optional(v.string()),
        size: v.optional(v.number()),
        uploadedAt: v.number(),
    })
        .index("by_clerk_id", ["clerkId"])
        .index("by_url", ["url"])
        .index("by_file_key", ["fileKey"]),

    resourceAccessLogs: defineTable({
        fileId: v.optional(v.id("files")),
        url: v.optional(v.string()),
        fileName: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        clerkId: v.optional(v.string()),
        accessType: v.union(v.literal("view"), v.literal("download")),
        accessedAt: v.number(),
        userAgent: v.optional(v.string()),
        referrer: v.optional(v.string()),
    })
        .index("by_fileId", ["fileId"])
        .index("by_userId", ["userId"])
        .index("by_accessedAt", ["accessedAt"])
        .index("by_file_accessedAt", ["fileId", "accessedAt"]),

    searchQueryLogs: defineTable({
        query: v.string(),
        normalizedQuery: v.string(),
        surface: v.string(),
        latencyMs: v.number(),
        resultCount: v.optional(v.number()),
        status: v.union(v.literal("success"), v.literal("error")),
        userId: v.optional(v.id("users")),
        clerkId: v.optional(v.string()),
        searchedAt: v.number(),
    })
        .index("by_searchedAt", ["searchedAt"])
        .index("by_surface", ["surface"])
        .index("by_userId", ["userId"]),

    courses: defineTable({
        courseCode: v.string(),
        title: v.string(),
        credits: v.number(),
        departmentId: v.id("users"),
        facultyId: v.id("users"),
        semester: v.number(),
        description: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_facultyId", ["facultyId"])
        .index("by_departmentId", ["departmentId"])
        .index("by_courseCode", ["courseCode"]),

    enrollments: defineTable({
        courseId: v.id("courses"),
        studentId: v.id("users"),
        semester: v.number(),
        attendancePercentage: v.optional(v.number()),
        enrolledAt: v.number(),
    })
        .index("by_courseId", ["courseId"])
        .index("by_studentId", ["studentId"])
        .index("by_course_student", ["courseId", "studentId"]),

    grades: defineTable({
    enrollmentId: v.id("enrollments"),
    mark: v.number(),
    maxMark: v.number(),
    assessmentType: v.union(
        v.literal("assignment"),
        v.literal("midterm"),
        v.literal("final"),
        v.literal("project"),
        v.literal("quiz")
    ),
    feedback: v.optional(v.string()),
    postedAt: v.number(),
    facultyId: v.id("users"),
})
    .index("by_enrollmentId", ["enrollmentId"])
    .index("by_facultyId", ["facultyId"]),

    assignments: defineTable({
        courseId: v.id("courses"),
        title: v.string(),
        description: v.optional(v.string()),
        dueDate: v.number(),
        fileUrl: v.optional(v.string()),
        fileName: v.optional(v.string()),
        maxMarks: v.number(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_courseId", ["courseId"])
        .index("by_createdBy", ["createdBy"])
        .index("by_dueDate", ["dueDate"]),
});
