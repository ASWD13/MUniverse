import { describe, expect, it } from "vitest";

import { normalizeTargetRoles, requireRole } from "../../convex/lib/rbac";

describe("rbac", () => {
    it("allows users with allowed roles", () => {
        expect(() => requireRole({ role: "faculty" }, ["admin", "faculty"]))
            .not.toThrow();
    });

    it("rejects users with forbidden roles", () => {
        expect(() => requireRole({ role: "student" }, ["admin", "faculty"]))
            .toThrowError("Forbidden");
    });

    it("normalizes and deduplicates target roles", () => {
        const normalized = normalizeTargetRoles(["student", "student", "faculty"]);
        expect(normalized).toEqual(["student", "faculty"]);
    });

    it("rejects empty targetRoles", () => {
        expect(() => normalizeTargetRoles([])).toThrowError(
            "targetRoles must not be empty",
        );
    });
});
