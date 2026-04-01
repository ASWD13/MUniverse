# MUniverse

## Quick start

1. Install dependencies:

```bash
pnpm install
```

2. Start Convex codegen and backend sync (keep running):

```bash
pnpm convex dev
```

3. Start Next.js in another terminal:

```bash
pnpm dev
```

4. Open:

- http://localhost:3000

## Backend modules

- User auth and profile sync: convex/users.ts
- Shared auth helper: convex/lib/auth.ts
- Shared role-based access helper: convex/lib/rbac.ts
- Announcement APIs: convex/announcements.ts
- Schema: convex/schema.ts

## Announcements API summary

- createAnnouncement: allowed roles are admin and faculty; validates title/content and targetRoles; sets authorId from authenticated user only; creates notifications for matching target roles.
- getAnnouncements: returns announcements filtered by current user role, sorted latest first by announcements.by_updatedAt; includes isRead and readAt metadata.
- markAnnouncementRead: uses announcementReads.by_user_announcement for efficient lookup; handles concurrent requests by canonicalizing duplicate read rows.
- deleteAnnouncement: admin-only; deletes related announcementReads and related announcement notifications.

## Key indexes

- announcements.by_updatedAt
- announcements.by_authorId
- announcementReads.by_user
- announcementReads.by_announcement
- announcementReads.by_user_announcement

## Testing

Run all tests:

```bash
pnpm test
```

Watch mode:

```bash
pnpm test:watch
```

Current backend tests are under tests/convex and cover:

- Auth helper behavior
- RBAC helper behavior
- Announcement API happy paths and authorization failures
- Concurrent markAnnouncementRead calls for the same user-announcement pair

## Notes

- Keep pnpm convex dev running while editing Convex schema/functions.
- See IMPLEMENTATION.md for the detailed architecture and implementation flow.

## Design tokens (UI)

Monochrome, high-contrast baseline used across all pages:

- `--canvas`: `#ffffff`
- `--surface`: `#ffffff`
- `--surface-muted`: `#fafafa`
- `--border`: `#e5e7eb`
- `--text`: `#111111`
- `--muted`: `#525252`

Shared utility classes in `app/globals.css`:

- `.surface-card`: rounded white panel with border
- `.surface-card-muted`: muted panel variant
- `.section-kicker`: small uppercase section label

Layout rules for consistency:

- Every top-level page uses `min-h-screen`.
- Auth and dashboard screens are full viewport height.
- Content surfaces must have explicit backgrounds (avoid transparent cards).
- Primary actions use near-black fill with white text; secondary actions are bordered white buttons.
