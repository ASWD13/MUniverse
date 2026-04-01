# MUniverse Implementation Guide

## 1. Overview

This document tracks the current backend implementation for auth, RBAC, announcements, notification fan-out, and read tracking.

Primary files:

- convex/schema.ts
- convex/users.ts
- convex/lib/auth.ts
- convex/lib/rbac.ts
- convex/announcements.ts
- tests/convex/\*.test.ts

## 2. Data model and indexes

### users

- Fields: clerkId, firstName, lastName, email, role, department, enrollmentNumber, employeeId, updatedAt
- Indexes: by_clerk_id, by_email, by_department, by_enrollmentNumber, by_employeeId

### announcements

- Fields: title, content, authorId, targetRoles, updatedAt
- Indexes: by_authorId, by_updatedAt

### notifications

- Fields: userId, type, content, isRead, relatedId
- Indexes: by_userId, by_type, by_user_unread

### announcementReads

- Fields: userId, announcementId, readAt
- Indexes: by_user, by_announcement, by_user_announcement

The by_user_announcement index is used for fast idempotent read lookup and conflict recovery.

## 3. Auth and RBAC layers

### requireUser

File: convex/lib/auth.ts

Behavior:

- Reads Convex identity from ctx.auth.getUserIdentity()
- Throws Unauthorized when no identity exists
- Loads user doc using users.by_clerk_id
- Throws User not found if identity has no matching user row

### requireRole and role normalization

File: convex/lib/rbac.ts

Behavior:

- APP_ROLES: student, faculty, admin
- requireRole(user, allowedRoles) throws Forbidden for disallowed roles
- normalizeTargetRoles(targetRoles) enforces non-empty and deduplicates values

## 4. Announcement API implementation

File: convex/announcements.ts

### createAnnouncement

- Auth required via requireUser
- Role gate: admin or faculty
- Validates title/content are non-empty after trim
- Validates and deduplicates targetRoles
- Inserts announcement with authorId set from authenticated user only
- Generates notifications for users whose role is in targetRoles (excluding author)

### getAnnouncements

- Auth required
- Loads announcements by by_updatedAt descending
- Filters to rows where targetRoles includes current user role
- Enriches each row with read metadata from announcementReads

### markAnnouncementRead

- Auth required
- Rejects if announcement does not exist
- Rejects if announcement is not visible to user role
- Uses by_user_announcement and canonicalization to ensure one stable read row per user-announcement pair
- If concurrent inserts happen, duplicates are cleaned up and a canonical id is returned

### deleteAnnouncement

- Auth required
- Role gate: admin only
- Rejects if announcement does not exist
- Deletes related rows in announcementReads
- Deletes related announcement notifications
- Deletes announcement row

## 5. Concurrency behavior for read marking

Concurrency target: multiple near-simultaneous markAnnouncementRead calls for the same user and announcement should converge to one final read row.

Current strategy:

1. Query by by_user_announcement.
2. If existing rows are found, pick canonical first row and remove duplicates.
3. If not found, insert a row, then re-query and canonicalize again.

This provides deterministic return behavior and cleanup under concurrent calls.

## 6. Tests

Test framework: Vitest

Location:

- tests/convex/auth.test.ts
- tests/convex/rbac.test.ts
- tests/convex/announcements.test.ts

Covered scenarios:

- Auth helper: missing identity, missing user, success
- RBAC helper: allow, deny, role normalization validation
- createAnnouncement: admin success, student forbidden
- getAnnouncements: role filtering and read state mapping
- markAnnouncementRead: sequential idempotency, role rejection, concurrent race scenario
- deleteAnnouncement: admin cleanup path, non-admin rejection

Run:

```bash
pnpm test
pnpm test:watch
pnpm -s tsc --noEmit
```

## 7. Local dev workflow

1. pnpm install
2. pnpm convex dev
3. pnpm dev
4. pnpm test

Keep pnpm convex dev running while editing Convex schema or functions so generated types stay in sync.
