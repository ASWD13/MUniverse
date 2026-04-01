import { describe, expect, it } from "vitest";

import { requireUser } from "../../convex/lib/auth";
import { createFakeConvexCtx } from "./fakeConvexCtx";

describe("requireUser", () => {
    it("throws when identity is missing", async () => {
        const { ctx } = createFakeConvexCtx({ identitySubject: null });

        await expect(requireUser(ctx as never)).rejects.toThrowError("Unauthorized");
    });

    it("throws when user record is missing", async () => {
        const { ctx } = createFakeConvexCtx({ identitySubject: "clerk_missing" });

        await expect(requireUser(ctx as never)).rejects.toThrowError("User not found");
    });

    it("returns the matching database user", async () => {
        const { ctx } = createFakeConvexCtx({
            identitySubject: "clerk_admin_1",
            users: [
                {
                    _id: "users:admin",
                    clerkId: "clerk_admin_1",
                    role: "admin",
                    firstName: "Admin",
                    lastName: "One",
                    email: "admin@example.edu",
                },
            ],
        });

        const user = await requireUser(ctx as never);

        expect(user._id).toBe("users:admin");
        expect(user.role).toBe("admin");
    });
});
