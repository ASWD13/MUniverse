import { afterEach, describe, expect, it, vi } from "vitest";

import {
    createAnnouncementHandler,
    deleteAnnouncementHandler,
    getAnnouncementsHandler,
    markAnnouncementReadHandler,
} from "../../convex/announcements";
import { createFakeConvexCtx } from "./fakeConvexCtx";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("announcements API handlers", () => {
    it("createAnnouncement allows admin and creates notifications for target roles", async () => {
        vi.spyOn(Date, "now").mockReturnValue(1700000000000);

        const { ctx, state } = createFakeConvexCtx({
            identitySubject: "clerk_admin",
            users: [
                {
                    _id: "users:admin",
                    clerkId: "clerk_admin",
                    role: "admin",
                    firstName: "A",
                    lastName: "D",
                    email: "admin@mu.edu",
                },
                {
                    _id: "users:faculty",
                    clerkId: "clerk_faculty",
                    role: "faculty",
                    firstName: "F",
                    lastName: "A",
                    email: "faculty@mu.edu",
                },
                {
                    _id: "users:student",
                    clerkId: "clerk_student",
                    role: "student",
                    firstName: "S",
                    lastName: "T",
                    email: "student@mu.edu",
                },
            ],
        });

        const id = await createAnnouncementHandler(ctx as never, {
            title: " New policy ",
            content: " Please review policy updates ",
            targetRoles: ["student", "faculty"],
        });

        const inserted = state.announcements.find((item) => item._id === id);
        expect(inserted).toBeDefined();
        expect(inserted?.authorId).toBe("users:admin");
        expect(inserted?.title).toBe("New policy");

        const recipients = state.notifications.map((notification) => notification.userId);
        expect(recipients).toContain("users:faculty");
        expect(recipients).toContain("users:student");
        expect(recipients).not.toContain("users:admin");
    });

    it("createAnnouncement rejects student", async () => {
        const { ctx } = createFakeConvexCtx({
            identitySubject: "clerk_student",
            users: [
                {
                    _id: "users:student",
                    clerkId: "clerk_student",
                    role: "student",
                    firstName: "S",
                    lastName: "T",
                    email: "student@mu.edu",
                },
            ],
        });

        await expect(
            createAnnouncementHandler(ctx as never, {
                title: "Test",
                content: "Not allowed",
                targetRoles: ["student"],
            }),
        ).rejects.toThrowError("Forbidden");
    });

    it("getAnnouncements returns role-filtered announcements with read status", async () => {
        const { ctx } = createFakeConvexCtx({
            identitySubject: "clerk_student",
            users: [
                {
                    _id: "users:student",
                    clerkId: "clerk_student",
                    role: "student",
                    firstName: "S",
                    lastName: "T",
                    email: "student@mu.edu",
                },
            ],
            announcements: [
                {
                    _id: "announcements:new",
                    title: "Student + Faculty",
                    content: "visible",
                    authorId: "users:admin",
                    targetRoles: ["student", "faculty"],
                    updatedAt: 2,
                },
                {
                    _id: "announcements:old",
                    title: "Students only",
                    content: "visible",
                    authorId: "users:admin",
                    targetRoles: ["student"],
                    updatedAt: 1,
                },
                {
                    _id: "announcements:faculty",
                    title: "Faculty only",
                    content: "hidden",
                    authorId: "users:admin",
                    targetRoles: ["faculty"],
                    updatedAt: 3,
                },
            ],
            announcementReads: [
                {
                    _id: "announcementReads:1",
                    userId: "users:student",
                    announcementId: "announcements:old",
                    readAt: 999,
                },
            ],
        });

        const result = await getAnnouncementsHandler(ctx as never);

        expect(result).toHaveLength(2);
        expect(result[0]._id).toBe("announcements:new");
        expect(result[0].isRead).toBe(false);
        expect(result[1]._id).toBe("announcements:old");
        expect(result[1].isRead).toBe(true);
        expect(result[1].readAt).toBe(999);
    });

    it("markAnnouncementRead is idempotent via compound index", async () => {
        vi.spyOn(Date, "now").mockReturnValue(1700000001000);

        const { ctx, state } = createFakeConvexCtx({
            identitySubject: "clerk_student",
            users: [
                {
                    _id: "users:student",
                    clerkId: "clerk_student",
                    role: "student",
                    firstName: "S",
                    lastName: "T",
                    email: "student@mu.edu",
                },
            ],
            announcements: [
                {
                    _id: "announcements:1",
                    title: "For students",
                    content: "visible",
                    authorId: "users:admin",
                    targetRoles: ["student"],
                    updatedAt: 1,
                },
            ],
        });

        const firstId = await markAnnouncementReadHandler(ctx as never, {
            announcementId: "announcements:1" as never,
        });

        const secondId = await markAnnouncementReadHandler(ctx as never, {
            announcementId: "announcements:1" as never,
        });

        expect(firstId).toBe(secondId);
        expect(state.announcementReads).toHaveLength(1);
    });

    it("markAnnouncementRead handles concurrent calls for same user and announcement", async () => {
        vi.spyOn(Date, "now").mockReturnValue(1700000002000);

        const { ctx, state } = createFakeConvexCtx({
            identitySubject: "clerk_student",
            users: [
                {
                    _id: "users:student",
                    clerkId: "clerk_student",
                    role: "student",
                    firstName: "S",
                    lastName: "T",
                    email: "student@mu.edu",
                },
            ],
            announcements: [
                {
                    _id: "announcements:race",
                    title: "Race announcement",
                    content: "visible",
                    authorId: "users:admin",
                    targetRoles: ["student"],
                    updatedAt: 1,
                },
            ],
        });

        const originalInsert = ctx.db.insert;
        let insertGateResolver: (() => void) | null = null;
        const insertGate = new Promise<void>((resolve) => {
            insertGateResolver = resolve;
        });
        let blockedInserts = 0;

        ctx.db.insert = async (tableName, doc) => {
            if (tableName === "announcementReads") {
                blockedInserts += 1;
                if (blockedInserts === 2) {
                    insertGateResolver?.();
                }
                await insertGate;
            }

            return originalInsert(tableName, doc);
        };

        const [firstId, secondId] = await Promise.all([
            markAnnouncementReadHandler(ctx as never, {
                announcementId: "announcements:race" as never,
            }),
            markAnnouncementReadHandler(ctx as never, {
                announcementId: "announcements:race" as never,
            }),
        ]);

        expect(firstId).toBe(secondId);
        expect(state.announcementReads).toHaveLength(1);
        expect(state.announcementReads[0].userId).toBe("users:student");
        expect(state.announcementReads[0].announcementId).toBe("announcements:race");
    });

    it("markAnnouncementRead rejects unauthorized role access", async () => {
        const { ctx } = createFakeConvexCtx({
            identitySubject: "clerk_student",
            users: [
                {
                    _id: "users:student",
                    clerkId: "clerk_student",
                    role: "student",
                    firstName: "S",
                    lastName: "T",
                    email: "student@mu.edu",
                },
            ],
            announcements: [
                {
                    _id: "announcements:1",
                    title: "Faculty only",
                    content: "hidden",
                    authorId: "users:admin",
                    targetRoles: ["faculty"],
                    updatedAt: 1,
                },
            ],
        });

        await expect(
            markAnnouncementReadHandler(ctx as never, {
                announcementId: "announcements:1" as never,
            }),
        ).rejects.toThrowError("Forbidden");
    });

    it("deleteAnnouncement is admin-only and removes related records", async () => {
        const { ctx, state } = createFakeConvexCtx({
            identitySubject: "clerk_admin",
            users: [
                {
                    _id: "users:admin",
                    clerkId: "clerk_admin",
                    role: "admin",
                    firstName: "A",
                    lastName: "D",
                    email: "admin@mu.edu",
                },
            ],
            announcements: [
                {
                    _id: "announcements:1",
                    title: "Delete me",
                    content: "soon",
                    authorId: "users:admin",
                    targetRoles: ["student"],
                    updatedAt: 1,
                },
            ],
            announcementReads: [
                {
                    _id: "announcementReads:1",
                    userId: "users:admin",
                    announcementId: "announcements:1",
                    readAt: 1,
                },
            ],
            notifications: [
                {
                    _id: "notifications:1",
                    userId: "users:admin",
                    type: "announcement",
                    content: "n1",
                    isRead: false,
                    relatedId: "announcements:1",
                },
                {
                    _id: "notifications:2",
                    userId: "users:admin",
                    type: "general",
                    content: "n2",
                    isRead: false,
                },
            ],
        });

        const result = await deleteAnnouncementHandler(ctx as never, {
            announcementId: "announcements:1" as never,
        });

        expect(result).toEqual({ success: true });
        expect(state.announcements).toHaveLength(0);
        expect(state.announcementReads).toHaveLength(0);
        expect(state.notifications).toHaveLength(1);
        expect(state.notifications[0].type).toBe("general");
    });

    it("deleteAnnouncement rejects non-admin users", async () => {
        const { ctx } = createFakeConvexCtx({
            identitySubject: "clerk_faculty",
            users: [
                {
                    _id: "users:faculty",
                    clerkId: "clerk_faculty",
                    role: "faculty",
                    firstName: "F",
                    lastName: "A",
                    email: "faculty@mu.edu",
                },
            ],
            announcements: [
                {
                    _id: "announcements:1",
                    title: "Keep",
                    content: "content",
                    authorId: "users:faculty",
                    targetRoles: ["student"],
                    updatedAt: 1,
                },
            ],
        });

        await expect(
            deleteAnnouncementHandler(ctx as never, {
                announcementId: "announcements:1" as never,
            }),
        ).rejects.toThrowError("Forbidden");
    });
});
