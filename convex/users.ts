import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireRole } from "./lib/rbac";

const appRoleValue = v.union(
    v.literal("student"),
    v.literal("faculty"),
    v.literal("admin"),
);

/**
 * Detect whether user is student or faculty
 */
function detectUserType(email: string | null): "student" | "faculty" | "unknown" {
    if (!email) return "unknown";

    const localPart = email.split("@")[0];

    // Strict student format: se23ucse034
    const studentPattern = /^[a-z]{2}\d{2}u[a-z]{3,4}\d{3}$/i;

    if (studentPattern.test(localPart)) return "student";

    return "faculty"; // fallback
}

/**
 * Extract enrollment number & department ONLY for students
 */
function extractAcademicDetails(email: string | null) {
    if (!email) {
        return {
            enrollmentNumber: undefined,
            department: undefined,
        };
    }

    const isUniversityEmail = email.endsWith("@mahindrauniversity.edu.in");

    if (!isUniversityEmail) {
        return {
            enrollmentNumber: undefined,
            department: undefined,
        };
    }

    const localPart = email.split("@")[0];

    const match = localPart.match(
        /^([a-z]{2})(\d{2})u([a-z]{3,4})(\d{3})$/i
    );

    if (!match) {
        return {
            enrollmentNumber: undefined,
            department: undefined,
        };
    }

    return {
        enrollmentNumber: localPart,
        department: match[3].toLowerCase(), // e.g. cse
    };
}

/**
 * Sync Clerk user → Convex DB
 */
export const upsertUser = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const claims = identity as Record<string, unknown>;

        const firstName =
            typeof claims.firstname === "string"
                ? claims.firstname
                : typeof claims.given_name === "string"
                    ? claims.given_name
                    : null;

        const lastName =
            typeof claims.lastname === "string"
                ? claims.lastname
                : typeof claims.family_name === "string"
                    ? claims.family_name
                    : null;

        const email =
            typeof claims.email === "string"
                ? claims.email
                : identity.email ?? null;

        // ✅ Detect role
        const type = detectUserType(email);
        const role = type === "student" ? "student" : "faculty";

        // ✅ Extract academic details
        const { enrollmentNumber, department } =
            extractAcademicDetails(email);

        // 🔍 Check if user exists
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) =>
                q.eq("clerkId", identity.subject)
            )
            .unique();

        if (existing) {
            // ✅ Update (DO NOT override role)
            await ctx.db.patch(existing._id, {
                firstName,
                lastName,
                email,
                enrollmentNumber,
                department,
                updatedAt: Date.now(),
            });

            return existing._id;
        }

        // 🆕 Create new user
        return await ctx.db.insert("users", {
            clerkId: identity.subject,
            firstName,
            lastName,
            email,
            role,

            enrollmentNumber,
            department,

            updatedAt: Date.now(),
        });
    },
});

/**
 * Get current authenticated user (basic profile)
 */
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const claims = identity as Record<string, unknown>;

        const firstName =
            typeof claims.firstname === "string"
                ? claims.firstname
                : typeof claims.given_name === "string"
                    ? claims.given_name
                    : null;

        const lastName =
            typeof claims.lastname === "string"
                ? claims.lastname
                : typeof claims.family_name === "string"
                    ? claims.family_name
                    : null;

        const audience =
            typeof claims.aud === "string"
                ? claims.aud
                : Array.isArray(claims.aud) &&
                    typeof claims.aud[0] === "string"
                    ? claims.aud[0]
                    : null;

        const email =
            typeof claims.email === "string"
                ? claims.email
                : identity.email ?? "(no email claim)";

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        const inferredType = detectUserType(email);
        const inferredRole = inferredType === "student" ? "student" : "faculty";
        const inferredAcademic = extractAcademicDetails(email);

        return {
            subject: identity.subject,
            audience,
            email,
            firstname: firstName,
            lastname: lastName,
            fullName:
                firstName && lastName
                    ? `${firstName} ${lastName}`
                    : firstName ?? lastName ?? identity.name ?? null,
            firstName,
            lastName,
            role: existingUser?.role ?? inferredRole,
            department: existingUser?.department ?? inferredAcademic.department ?? null,
            enrollmentNumber:
                existingUser?.enrollmentNumber ?? inferredAcademic.enrollmentNumber ?? null,
            employeeId: existingUser?.employeeId ?? null,
        };
    },
});

export const listUsersForAdmin = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await requireUser(ctx);
        requireRole(currentUser, ["admin"]);

        const users = await ctx.db.query("users").collect();

        return users
            .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
            .map((user) => {
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

                return {
                    _id: user._id,
                    role: user.role,
                    fullName: fullName || user.email || user.clerkId,
                    email: user.email,
                    department: user.department ?? null,
                    enrollmentNumber: user.enrollmentNumber ?? null,
                    employeeId: user.employeeId ?? null,
                    isCurrentAdmin: user._id === currentUser._id,
                };
            });
    },
});

export const setUserRole = mutation({
    args: {
        userId: v.id("users"),
        role: appRoleValue,
    },
    handler: async (ctx, args) => {
        const currentUser = await requireUser(ctx);
        requireRole(currentUser, ["admin"]);

        const targetUser = await ctx.db.get(args.userId);
        if (!targetUser) {
            throw new Error("User not found");
        }

        if (targetUser._id === currentUser._id && args.role !== "admin") {
            throw new Error("You cannot remove your own admin role");
        }

        await ctx.db.patch(args.userId, {
            role: args.role,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});
