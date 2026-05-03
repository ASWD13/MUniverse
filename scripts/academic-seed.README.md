# Academic Seed Data

Create `scripts/academic-seed.json` from `scripts/academic-seed.template.json`, then fill it with real data only.

Run:

```bash
pnpm seed:academic -- --push
```

Use `--prod` only when you intentionally want to seed production:

```bash
pnpm seed:academic -- scripts/academic-seed.json --push --prod
```

## Shape

`courses` entries need:

- `courseCode`
- `title`
- `credits`
- `semester`
- `faculty`: one of `email`, `employeeId`, or `enrollmentNumber`
- `departmentOwner`: optional user lookup; when omitted, the faculty user is used for the existing `courses.departmentId` field
- `description`: optional

`enrollments` entries need:

- `courseCode`
- `student`: one of `email`, `employeeId`, or `enrollmentNumber`
- `semester`
- `attendancePercentage`: optional

`assignments` entries need:

- `courseCode`
- `title`
- `dueDate`: ISO date string or timestamp
- `maxMarks`
- `description`, `fileUrl`, `fileName`, `createdBy`: optional

`grades` entries need:

- `courseCode`
- `student`: one of `email`, `employeeId`, or `enrollmentNumber`
- `mark`
- `maxMark`
- `assessmentType`: `assignment`, `midterm`, `final`, `project`, or `quiz`
- `feedback`, `faculty`: optional
