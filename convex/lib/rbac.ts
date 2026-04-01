import type { Doc } from "../_generated/dataModel";

export const APP_ROLES = ["student", "faculty", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: string): value is AppRole {
    return APP_ROLES.includes(value as AppRole);
}

export function requireRole(
    user: Pick<Doc<"users">, "role">,
    allowedRoles: readonly AppRole[],
): void {
    if (!allowedRoles.includes(user.role)) {
        throw new Error("Forbidden");
    }
}

export function normalizeTargetRoles(targetRoles: readonly AppRole[]): AppRole[] {
    if (targetRoles.length === 0) {
        throw new Error("targetRoles must not be empty");
    }

    const uniqueRoles = Array.from(new Set(targetRoles));

    if (!uniqueRoles.every((role) => isAppRole(role))) {
        throw new Error("Invalid target role");
    }

    return uniqueRoles;
}
