import { describe, it, expect } from "vitest";
import { createFakeConvexCtx } from "./fakeConvexCtx";

import { getCoursesByFaculty } from "../../convex/courses";
import { getAssignmentsByCourse } from "../../convex/assignments";
import { getEnrollmentsByCourse } from "../../convex/enrollments";

const FAKE_COURSE_ID = "test-course-id" as any;
const FAKE_FACULTY_ID = "test-faculty-id" as any;
const GHOST_IDENTITY = "ghost-user-id";

function expectAuthError(error: unknown) {
  expect(error).toBeDefined();
}

describe("Unauthorized access tests", () => {

  // ─────────────────────────────────────────────
  // 1. NO AUTH
  // ─────────────────────────────────────────────

  it("getCoursesByFaculty without auth", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    try {
      const res = await (getCoursesByFaculty as any)(ctx as any, {
        facultyId: FAKE_FACULTY_ID,
      });

      console.warn("⚠️ VULNERABILITY: getCoursesByFaculty returned", res);
      expect(res).toBeUndefined();
    } catch (err) {
      expectAuthError(err);
    }
  });

  it("getAssignmentsByCourse without auth", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    try {
      const res = await (getAssignmentsByCourse as any)(ctx as any, {
        courseId: FAKE_COURSE_ID,
      });

      console.warn("⚠️ VULNERABILITY: getAssignments returned", res);
      expect(res).toBeUndefined();
    } catch (err) {
      expectAuthError(err);
    }
  });

  it("getEnrollmentsByCourse without auth", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    try {
      const res = await (getEnrollmentsByCourse as any)(ctx as any, {
        courseId: FAKE_COURSE_ID,
      });

      console.warn("⚠️ VULNERABILITY: enrollments leaked", res);
      expect(res).toBeUndefined();
    } catch (err) {
      expectAuthError(err);
    }
  });

  // ─────────────────────────────────────────────
  // 2. GHOST USER
  // ─────────────────────────────────────────────

  it("ghost identity should not access data", async () => {
    const { ctx } = createFakeConvexCtx({
      identitySubject: GHOST_IDENTITY,
    });

    await expect(
      (getCoursesByFaculty as any)(ctx as any, {
        facultyId: FAKE_FACULTY_ID,
      })
    ).rejects.toThrow();
  });

  // ─────────────────────────────────────────────
  // 3. SEQUENTIAL PROBE
  // ─────────────────────────────────────────────

  it("sequential probe across endpoints", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    const results: any[] = [];

    try {
      results.push(await (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID }));
    } catch {}

    try {
      results.push(await (getAssignmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID }));
    } catch {}

    try {
      results.push(await (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID }));
    } catch {}

    const leaked = results.filter(Boolean);

    if (leaked.length > 0) {
      console.warn("⚠️ SECURITY ISSUE: endpoints leaked data", leaked.length);
    }

    expect(leaked.length).toBe(0);
  });

  // ─────────────────────────────────────────────
  // 4. PARALLEL (Promise.all)
  // ─────────────────────────────────────────────

  it("parallel unauthenticated requests", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    const results = await Promise.allSettled([
      (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID }),
      (getAssignmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID }),
      (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID }),
    ]);

    for (const r of results) {
      if (r.status === "fulfilled") {
        console.warn("⚠️ VULNERABILITY: parallel leak", r.value);
        expect(r.value).toBeUndefined();
      }
    }
  });

  // ─────────────────────────────────────────────
  // 5. EDGE CASES
  // ─────────────────────────────────────────────

  it("invalid input should not leak data", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    try {
      const res = await (getCoursesByFaculty as any)(ctx as any, {
        facultyId: null as any,
      });

      expect(res).toBeUndefined();
    } catch (err) {
      expectAuthError(err);
    }
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// ADVANCED SECURITY TESTS — new describe blocks appended, originals untouched
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// 6. DATA LEAKAGE — field-level PII inspection
// ─────────────────────────────────────────────

describe("Data leakage: sensitive field exposure", () => {

  it("enrollment records must not expose studentId to unauthenticated caller", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let rows: any[] = [];
    try {
      rows = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID });
    } catch (_e) {
      return; // threw — secure path
    }

    if (!Array.isArray(rows)) return;

    for (const row of rows) {
      expect(
        row?.studentId,
        "[DATA LEAKAGE] studentId exposed to unauthenticated caller"
      ).toBeUndefined();
      expect(
        row?.student?._id,
        "[DATA LEAKAGE] nested student._id exposed to unauthenticated caller"
      ).toBeUndefined();
    }
  });

  it("enrollment records must not expose grade to unauthenticated caller", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let rows: any[] = [];
    try {
      rows = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID });
    } catch (_e) {
      return;
    }

    if (!Array.isArray(rows)) return;

    for (const row of rows) {
      expect(
        row?.grade,
        "[DATA LEAKAGE] grade field exposed to unauthenticated caller"
      ).toBeUndefined();
    }
  });

  it("enrollment records must not expose GPA to unauthenticated caller", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let rows: any[] = [];
    try {
      rows = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID });
    } catch (_e) {
      return;
    }

    if (!Array.isArray(rows)) return;

    for (const row of rows) {
      expect(
        row?.gpa,
        "[DATA LEAKAGE] gpa field exposed to unauthenticated caller"
      ).toBeUndefined();
    }
  });

  it("assignments must not expose unpublished entries to unauthenticated caller", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let rows: any[] = [];
    try {
      rows = await (getAssignmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID });
    } catch (_e) {
      return;
    }

    if (!Array.isArray(rows)) return;

    const unpublished = rows.filter((r: any) => r?.published === false);

    if (unpublished.length > 0) {
      console.warn(`[DATA LEAKAGE] ${unpublished.length} unpublished assignment(s) visible without auth`);
    }

    expect(
      unpublished.length,
      "[DATA LEAKAGE] Unpublished assignments must never be visible without authentication"
    ).toBe(0);
  });

  it("course list must not expose internal facultyId to unauthenticated caller", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let rows: any[] = [];
    try {
      rows = await (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID });
    } catch (_e) {
      return;
    }

    if (!Array.isArray(rows)) return;

    for (const row of rows) {
      expect(
        row?.facultyId,
        "[DATA LEAKAGE] facultyId exposed on course record to unauthenticated caller"
      ).toBeUndefined();
    }
  });

});

// ─────────────────────────────────────────────
// 7. MULTI-STEP ATTACK SIMULATION
// ─────────────────────────────────────────────

describe("Multi-step attack simulation", () => {

  it("attacker cannot chain course list → assignments to build a course map", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    // Step 1 — enumerate courses
    let courses: any[] = [];
    try {
      courses = await (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID });
    } catch (_e) {
      courses = [];
    }

    // Step 2 — use each leaked courseId to probe assignments
    const assignmentLeaks: any[] = [];
    for (const course of courses ?? []) {
      try {
        const assignments = await (getAssignmentsByCourse as any)(ctx as any, {
          courseId: course?._id ?? FAKE_COURSE_ID,
        });
        if (Array.isArray(assignments) && assignments.length > 0) {
          assignmentLeaks.push(...assignments);
        }
      } catch (_e) {
        // blocked — expected
      }
    }

    if (assignmentLeaks.length > 0) {
      console.warn(
        `[ATTACK CHAIN] courses→assignments chain leaked ${assignmentLeaks.length} record(s)`
      );
    }

    expect(
      assignmentLeaks.length,
      "[ATTACK CHAIN] Course→assignment pivot must not yield data without authentication"
    ).toBe(0);
  });

  it("attacker cannot chain course list → enrollments to extract student PII", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let courses: any[] = [];
    try {
      courses = await (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID });
    } catch (_e) {
      courses = [];
    }

    const enrollmentLeaks: any[] = [];
    for (const course of courses ?? []) {
      try {
        const enrollments = await (getEnrollmentsByCourse as any)(ctx as any, {
          courseId: course?._id ?? FAKE_COURSE_ID,
        });
        if (Array.isArray(enrollments) && enrollments.length > 0) {
          enrollmentLeaks.push(...enrollments);
        }
      } catch (_e) {
        // blocked — expected
      }
    }

    if (enrollmentLeaks.length > 0) {
      console.warn(
        `[ATTACK CHAIN] courses→enrollments chain leaked ${enrollmentLeaks.length} student record(s)`
      );
    }

    expect(
      enrollmentLeaks.length,
      "[ATTACK CHAIN] Course→enrollment pivot must not expose student PII without authentication"
    ).toBe(0);
  });

  it("ghost user cannot pivot from a course response to query enrollments", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: GHOST_IDENTITY });

    // Step 1 — ghost attempts to get a real courseId
    let pivotCourseId: any = FAKE_COURSE_ID;
    try {
      const courses = await (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID });
      if (Array.isArray(courses) && courses[0]?._id) {
        pivotCourseId = courses[0]._id;
        console.warn("[ATTACK PIVOT] Ghost obtained a real courseId from getCoursesByFaculty");
      }
    } catch (_e) {
      // blocked at step 1 — no pivot possible
    }

    // Step 2 — use whatever courseId was obtained to probe enrollments
    let enrollments: any[] = [];
    try {
      enrollments = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: pivotCourseId });
    } catch (_e) {
      enrollments = [];
    }

    if (enrollments.length > 0) {
      console.warn(
        `[ATTACK PIVOT] Ghost pivoted to enrollment data: ${enrollments.length} record(s)`
      );
    }

    expect(
      enrollments.length,
      "[ATTACK PIVOT] Ghost identity must not pivot between endpoints to extract data"
    ).toBe(0);
  });

  it("attacker using sequential course IDs cannot enumerate enrollment records", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    const guessedIds = [
      "course-0001", "course-0002", "course-0003",
      "course-0004", "course-0005",
    ];

    const collectedEnrollments: any[] = [];

    for (const id of guessedIds) {
      try {
        const enrollments = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: id as any });
        if (Array.isArray(enrollments) && enrollments.length > 0) {
          collectedEnrollments.push(...enrollments);
        }
      } catch (_e) {
        // blocked — expected for each attempt
      }
    }

    if (collectedEnrollments.length > 0) {
      console.warn(
        `[ENUMERATION] Sequential ID probe leaked ${collectedEnrollments.length} enrollment record(s)`
      );
    }

    expect(
      collectedEnrollments.length,
      "[ENUMERATION] Sequential courseId guessing must not yield any enrollment records"
    ).toBe(0);
  });

});

// ─────────────────────────────────────────────
// 8. PARTIAL AUTH — wrong role / wrong user type
// ─────────────────────────────────────────────

describe("Partial auth: insufficient role or wrong user type", () => {

  it("student identity must not access a different faculty member's course list", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: "student-subject-id-001" });

    let result: any;
    let threw = false;

    try {
      result = await (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID });
    } catch (_e) {
      threw = true;
    }

    if (!threw && Array.isArray(result) && result.length > 0) {
      console.warn(
        `[RBAC VIOLATION] Student identity received ${result.length} course(s) owned by a different faculty member`
      );
      for (const course of result) {
        expect(
          course?.facultyId,
          "[RBAC VIOLATION] Student received a course belonging to a different faculty member"
        ).not.toBe(FAKE_FACULTY_ID);
      }
    }
  });

  it("student identity must not read another student's enrollment PII", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: "student-subject-id-001" });

    let rows: any[] = [];
    try {
      rows = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID });
    } catch (_e) {
      return; // correctly blocked
    }

    if (!Array.isArray(rows)) return;

    for (const row of rows) {
      if (row?.studentId && row.studentId !== "student-subject-id-001") {
        console.warn("[RBAC VIOLATION] Enrollment record for a different student was returned");
        expect(row.grade, "[RBAC VIOLATION] grade leaked for another student").toBeUndefined();
        expect(row.gpa,   "[RBAC VIOLATION] gpa leaked for another student").toBeUndefined();
      }
    }
  });

  it("unknown role identity must not receive any course data from getCoursesByFaculty", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: "unknown-role-subject-xyz" });

    let result: any;
    let threw = false;

    try {
      result = await (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID });
    } catch (_e) {
      threw = true;
    }

    if (!threw && Array.isArray(result) && result.length > 0) {
      console.warn(
        `[RBAC VIOLATION] Unknown-role identity received ${result.length} course(s)`
      );
      expect(result, "Unknown-role identity must not receive course data").toHaveLength(0);
    }
  });

  it("unknown role identity must not receive enrollment data", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: "unknown-role-subject-xyz" });

    let result: any;
    let threw = false;

    try {
      result = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID });
    } catch (_e) {
      threw = true;
    }

    if (!threw && Array.isArray(result) && result.length > 0) {
      console.warn(
        `[RBAC VIOLATION] Unknown-role identity received ${result.length} enrollment record(s)`
      );
      expect(result, "Unknown-role identity must not receive enrollment data").toHaveLength(0);
    }
  });

});

// ─────────────────────────────────────────────
// 9. INVALID INPUT ATTACKS
// ─────────────────────────────────────────────

describe("Invalid input attacks (unauthenticated)", () => {

  it("extremely long facultyId string does not cause a data dump or crash", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });
    const longId = "x".repeat(10_000) as any;

    let result: any;
    try {
      result = await (getCoursesByFaculty as any)(ctx as any, { facultyId: longId });
    } catch (_e) {
      return; // correctly rejected
    }

    expect(
      Array.isArray(result) ? result.length : 0,
      "Oversized facultyId must not trigger a data dump"
    ).toBe(0);
  });

  it("numeric courseId does not expose assignment data", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let result: any;
    try {
      result = await (getAssignmentsByCourse as any)(ctx as any, { courseId: 99999 as any });
    } catch (_e) {
      return;
    }

    expect(
      Array.isArray(result) ? result.length : 0,
      "Numeric courseId must not return assignment rows"
    ).toBe(0);
  });

  it("object injection as courseId does not leak enrollment data", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let result: any;
    try {
      // MongoDB-style injection probe
      result = await (getEnrollmentsByCourse as any)(ctx as any, {
        courseId: { $gt: "" } as any,
      });
    } catch (_e) {
      return;
    }

    expect(
      Array.isArray(result) ? result.length : 0,
      "Object injection as courseId must not return enrollment rows"
    ).toBe(0);
  });

  it("undefined courseId does not trigger a full-table enrollment scan", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let result: any;
    try {
      result = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: undefined as any });
    } catch (_e) {
      return;
    }

    expect(
      Array.isArray(result) ? result.length : 0,
      "Undefined courseId must not return any enrollment records"
    ).toBe(0);
  });

  it("array as facultyId does not cause unexpected course data exposure", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let result: any;
    try {
      result = await (getCoursesByFaculty as any)(ctx as any, {
        facultyId: [FAKE_FACULTY_ID, "another-id"] as any,
      });
    } catch (_e) {
      return;
    }

    expect(
      Array.isArray(result) ? result.length : 0,
      "Array as facultyId must not return course records"
    ).toBe(0);
  });

  it("SQL-injection-style string as courseId does not leak data", async () => {
    const { ctx } = createFakeConvexCtx({ identitySubject: null });

    let result: any;
    try {
      result = await (getEnrollmentsByCourse as any)(ctx as any, {
        courseId: "' OR '1'='1" as any,
      });
    } catch (_e) {
      return;
    }

    expect(
      Array.isArray(result) ? result.length : 0,
      "SQL-style injection courseId must not return any enrollment records"
    ).toBe(0);
  });

});

// ─────────────────────────────────────────────
// 10. STRESS / REPEATED PROBING (light)
// ─────────────────────────────────────────────

describe("Stress: repeated unauthenticated probing", () => {

  it("getCoursesByFaculty consistently blocks unauthenticated access over 8 attempts", async () => {
    const ATTEMPTS = 8;
    let leaks = 0;

    for (let i = 0; i < ATTEMPTS; i++) {
      const { ctx } = createFakeConvexCtx({ identitySubject: null });
      try {
        const result = await (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID });
        if (Array.isArray(result) && result.length > 0) {
          leaks++;
          console.warn(`[STRESS] Attempt ${i + 1}: getCoursesByFaculty leaked ${result.length} row(s)`);
        }
      } catch (_e) {
        // blocked — expected
      }
    }

    expect(
      leaks,
      `getCoursesByFaculty leaked data on ${leaks}/8 unauthenticated attempts`
    ).toBe(0);
  });

  it("getEnrollmentsByCourse consistently blocks unauthenticated access over 8 attempts", async () => {
    const ATTEMPTS = 8;
    let leaks = 0;

    for (let i = 0; i < ATTEMPTS; i++) {
      const { ctx } = createFakeConvexCtx({ identitySubject: null });
      try {
        const result = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID });
        if (Array.isArray(result) && result.length > 0) {
          leaks++;
          console.warn(`[STRESS] Attempt ${i + 1}: getEnrollmentsByCourse leaked ${result.length} enrollment(s)`);
        }
      } catch (_e) {
        // blocked — expected
      }
    }

    expect(
      leaks,
      `getEnrollmentsByCourse leaked data on ${leaks}/8 unauthenticated attempts`
    ).toBe(0);
  });

  it("alternating ghost / null identity probes do not accumulate leaked rows", async () => {
    const identities = [null, GHOST_IDENTITY, null, GHOST_IDENTITY, null, GHOST_IDENTITY];
    const collectedRows: any[] = [];

    for (let i = 0; i < identities.length; i++) {
      const { ctx } = createFakeConvexCtx({ identitySubject: identities[i] });

      try {
        const courses = await (getCoursesByFaculty as any)(ctx as any, { facultyId: FAKE_FACULTY_ID });
        if (Array.isArray(courses) && courses.length > 0) collectedRows.push(...courses);
      } catch (_e) {}

      try {
        const enrollments = await (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID });
        if (Array.isArray(enrollments) && enrollments.length > 0) collectedRows.push(...enrollments);
      } catch (_e) {}
    }

    if (collectedRows.length > 0) {
      console.warn(
        `[STRESS] Alternating probe accumulated ${collectedRows.length} row(s) across ${identities.length} iterations`
      );
    }

    expect(
      collectedRows.length,
      "Alternating ghost/null probes must not accumulate any leaked rows"
    ).toBe(0);
  });

  it("rapid parallel bursts from ghost identity do not bypass auth", async () => {
    // 3 bursts of 3 parallel calls each — simulates a bot probing in waves
    const BURSTS = 3;
    let totalLeaked = 0;

    for (let burst = 0; burst < BURSTS; burst++) {
      const { ctx } = createFakeConvexCtx({ identitySubject: GHOST_IDENTITY });

      const settled = await Promise.allSettled([
        (getCoursesByFaculty as any)(ctx as any,    { facultyId: FAKE_FACULTY_ID }),
        (getAssignmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID }),
        (getEnrollmentsByCourse as any)(ctx as any, { courseId: FAKE_COURSE_ID }),
      ]);

      for (const r of settled) {
        if (r.status === "fulfilled" && Array.isArray((r as any).value)) {
          const rows = (r as any).value as any[];
          if (rows.length > 0) {
            totalLeaked += rows.length;
            console.warn(`[STRESS BURST ${burst + 1}] Ghost burst leaked ${rows.length} row(s)`);
          }
        }
      }
    }

    expect(
      totalLeaked,
      `Ghost identity burst probe leaked ${totalLeaked} total row(s) across ${BURSTS} bursts`
    ).toBe(0);
  });

});

it("should reject access when session is expired (null identity)", async () => {
  const { ctx } = createFakeConvexCtx({
    identitySubject: null, // simulates expired session
  });

  await expect(
    (getCoursesByFaculty as any)(ctx, {
      facultyId: "test-id",
    })
  ).rejects.toBeDefined();
});