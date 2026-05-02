import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

export const getUsageReport = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await requireUser(ctx);
        requireRole(currentUser, ["admin"]);

        // ── Users ────────────────────────────────────────────────
        const allUsers = await ctx.db.query("users").collect();
        const totalUsers = allUsers.length;
        const studentCount = allUsers.filter((u) => u.role === "student").length;
        const facultyCount = allUsers.filter((u) => u.role === "faculty").length;
        const adminCount = allUsers.filter((u) => u.role === "admin").length;

        // Department breakdown
        const deptMap: Record<string, number> = {};
        for (const u of allUsers) {
            if (u.department) {
                deptMap[u.department] = (deptMap[u.department] ?? 0) + 1;
            }
        }
        const departmentBreakdown = Object.entries(deptMap)
            .map(([dept, count]) => ({ dept, count }))
            .sort((a, b) => b.count - a.count);

        // ── Announcements ────────────────────────────────────────
        const allAnnouncements = await ctx.db.query("announcements").collect();
        const totalAnnouncements = allAnnouncements.length;

        // Read stats per announcement
        const allReads = await ctx.db.query("announcementReads").collect();
        const readCountByAnnouncement: Record<string, number> = {};
        for (const read of allReads) {
            const key = read.announcementId as string;
            readCountByAnnouncement[key] = (readCountByAnnouncement[key] ?? 0) + 1;
        }

        const announcementStats = allAnnouncements.map((a) => ({
            _id: a._id,
            title: a.title,
            targetRoles: a.targetRoles,
            updatedAt: a.updatedAt,
            readCount: readCountByAnnouncement[a._id as string] ?? 0,
        }));

        const totalReads = allReads.length;
        const totalUnread = totalAnnouncements * totalUsers - totalReads; // rough estimate

        // Role targeting breakdown
        const roleTargetMap: Record<string, number> = { student: 0, faculty: 0, admin: 0 };
        for (const a of allAnnouncements) {
            for (const role of a.targetRoles) {
                roleTargetMap[role] = (roleTargetMap[role] ?? 0) + 1;
            }
        }

        // ── Notifications ────────────────────────────────────────
        const allNotifications = await ctx.db.query("notifications").collect();
        const totalNotifications = allNotifications.length;
        const readNotifications = allNotifications.filter((n) => n.isRead).length;
        const unreadNotifications = totalNotifications - readNotifications;

        // ── Files / Resources ────────────────────────────────────
        const allFiles = await ctx.db.query("files").collect();
        const totalFiles = allFiles.length;
        const totalStorageBytes = allFiles.reduce((sum, f) => sum + (f.size ?? 0), 0);

        // ── Courses ──────────────────────────────────────────────
        // These exist in schema — will auto-populate when Anshika's APIs push data
        let totalCourses = 0;
        let totalEnrollments = 0;
        let totalAssignments = 0;
        let totalGrades = 0;

        try {
            const courses = await ctx.db.query("courses").collect();
            totalCourses = courses.length;
        } catch { /* table may be empty */ }

        try {
            const enrollments = await ctx.db.query("enrollments").collect();
            totalEnrollments = enrollments.length;
        } catch { /* table may be empty */ }

        try {
            const assignments = await ctx.db.query("assignments").collect();
            totalAssignments = assignments.length;
        } catch { /* table may be empty */ }

        try {
            const grades = await ctx.db.query("grades").collect();
            totalGrades = grades.length;
        } catch { /* table may be empty */ }

        return {
            generatedAt: Date.now(),

            users: {
                total: totalUsers,
                students: studentCount,
                faculty: facultyCount,
                admins: adminCount,
                departmentBreakdown,
            },

            announcements: {
                total: totalAnnouncements,
                totalReads,
                roleTargetBreakdown: roleTargetMap,
                perAnnouncement: announcementStats,
            },

            notifications: {
                total: totalNotifications,
                read: readNotifications,
                unread: unreadNotifications,
            },

            files: {
                total: totalFiles,
                totalStorageBytes,
            },

            // ── These auto-populate once Anshika's Phase 2 APIs push data ──
            academic: {
                totalCourses,
                totalEnrollments,
                totalAssignments,
                totalGrades,
            },
        };
    },
});