"use client";

import { useState, type FormEvent } from "react";
import MainLayout from "./MainLayout";
import { FormInput, PrimaryButton } from "./UIElements";

type ResourceType = "PDF" | "DOC" | "PPTX" | "VIDEO";
type VisibilityScope = "All" | "Program: B.Tech CSE" | "Class: CN-202" | "Section: B";

type Resource = {
  id: number;
  title: string;
  course: string;
  type: ResourceType;
  scope: VisibilityScope;
  uploadedBy: "faculty" | "admin";
  date: string;
  size: string;
};

const INITIAL_RESOURCES: Resource[] = [
  { id: 1, title: "Computer Networks – Module 1 Notes", course: "CS301", type: "PDF", scope: "Class: CN-202", uploadedBy: "faculty", date: "28 Apr 2026, 9:00 am", size: "2.4 MB" },
  { id: 2, title: "Data Structures Lab Manual", course: "CS201", type: "PDF", scope: "Program: B.Tech CSE", uploadedBy: "faculty", date: "25 Apr 2026, 11:30 am", size: "5.1 MB" },
  { id: 3, title: "Software Engineering Syllabus 2026", course: "CS401", type: "DOC", scope: "All", uploadedBy: "admin", date: "20 Apr 2026, 3:15 pm", size: "340 KB" },
  { id: 4, title: "OS Lecture Slides – Week 6", course: "CS302", type: "PPTX", scope: "Class: CN-202", uploadedBy: "faculty", date: "18 Apr 2026, 8:45 am", size: "8.2 MB" },
  { id: 5, title: "DBMS Assignment 3 — ER Diagrams", course: "CS203", type: "PDF", scope: "Section: B", uploadedBy: "faculty", date: "15 Apr 2026, 5:00 pm", size: "1.1 MB" },
];

const FILE_TYPES: ResourceType[] = ["PDF", "DOC", "PPTX", "VIDEO"];

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

export default function ResourceManagement() {
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | ResourceType>("all");
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [scope, setScope] = useState<VisibilityScope>("All");
  const [fileType, setFileType] = useState<ResourceType>("PDF");
  const [uploadedBy, setUploadedBy] = useState<"faculty" | "admin">("faculty");
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const filtered = resources.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.course.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || r.type === filterType;
    return matchSearch && matchType;
  });

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !course.trim()) {
      setFormError("Title and course code are required.");
      return;
    }
    setFormError(null);
    setIsUploading(true);
    await new Promise((r) => setTimeout(r, 600));
    setResources((prev) => [
      {
        id: Date.now(),
        title: title.trim(),
        course: course.trim().toUpperCase(),
        type: fileType,
        scope,
        uploadedBy,
        date: "1 May 2026, just now",
        size: "—",
      },
      ...prev,
    ]);
    setTitle("");
    setCourse("");
    setIsUploading(false);
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(id);
    await new Promise((r) => setTimeout(r, 400));
    setResources((prev) => prev.filter((r) => r.id !== id));
    setIsDeleting(null);
  };

  return (
    <MainLayout roleLabel="Admin">
      <div className="w-full space-y-6">

        {/* Header */}
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Resource Management</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            Academic Resource Library
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Upload, manage, and organise course materials across programs, sections, and schools.
          </p>
        </header>

        {/* Stat cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Resources" value={resources.length} />
          <StatCard label="PDFs" value={resources.filter((r) => r.type === "PDF").length} />
          <StatCard label="Courses Covered" value={new Set(resources.map((r) => r.course)).size} />
          <StatCard label="Uploaded by Admin" value={resources.filter((r) => r.uploadedBy === "admin").length} />
        </section>

        {/* Upload + Browser */}
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">

          {/* Upload panel */}
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Upload Interface</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">Add Resource</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Attach a file and assign it to a course or visibility scope.
              </p>
            </header>

            <form onSubmit={handleUpload} className="mt-5 space-y-4">
              <FormInput
                label="Resource Title"
                placeholder="e.g., Module 4 Lecture Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <FormInput
                label="Course Code"
                placeholder="e.g., CS301"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              />

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                  File Type
                </legend>
                <div className="flex flex-wrap gap-2">
                  {FILE_TYPES.map((t) => (
                    <label
                      key={t}
                      className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] ${
                        fileType === t
                          ? "border-white/50 bg-white/18 text-white"
                          : "border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fileType"
                        value={t}
                        checked={fileType === t}
                        onChange={() => setFileType(t)}
                        className="sr-only"
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                  Visibility Scope
                </span>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as VisibilityScope)}
                  className="h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                >
                  <option value="All">All Users</option>
                  <option value="Program: B.Tech CSE">Program: B.Tech CSE</option>
                  <option value="Class: CN-202">Class: CN-202</option>
                  <option value="Section: B">Section: B</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                  Uploaded By
                </span>
                <select
                  value={uploadedBy}
                  onChange={(e) => setUploadedBy(e.target.value as "faculty" | "admin")}
                  className="h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                >
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <div className="rounded-lg border border-dashed border-white/20 bg-white/3 px-4 py-8 text-center">
                <p className="text-sm text-zinc-400">Drop file here or click to browse</p>
                <p className="mt-1 text-xs text-zinc-500">PDF, DOCX, PPTX, MP4 — max 50 MB</p>
              </div>

              {formError ? (
                <p className="text-sm font-medium text-zinc-200">{formError}</p>
              ) : null}

              <PrimaryButton className="w-full" type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload Resource"}
              </PrimaryButton>
            </form>
          </article>

          {/* Resource browser */}
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Resource Browser</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">All Resources</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Search and filter academic materials by title or course code.
              </p>
            </header>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title or course code"
                  className="h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Type filter</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "all" | ResourceType)}
                  className="h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                >
                  <option value="all">all types</option>
                  <option value="PDF">PDF</option>
                  <option value="DOC">DOC</option>
                  <option value="PPTX">PPTX</option>
                  <option value="VIDEO">VIDEO</option>
                </select>
              </label>
            </div>

            <p className="mt-3 text-xs text-zinc-400">
              Showing {filtered.length} of {resources.length} resources
            </p>

            {filtered.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-400">No resources match your search.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {filtered.map((r) => (
                  <li key={r.id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-display text-base font-semibold text-white">{r.title}</h3>
                        <p className="text-xs text-zinc-400">Updated {r.date} · {r.size}</p>
                        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em]">
                          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-zinc-200">
                            {r.course}
                          </span>
                          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-zinc-200">
                            {r.type}
                          </span>
                          <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                            {r.uploadedBy}
                          </span>
                          <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                            {r.scope}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        disabled={isDeleting === r.id}
                        className="h-8 cursor-pointer rounded-md border border-white/25 px-3 text-xs font-medium text-white transition hover:bg-white/12 active:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting === r.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </div>
    </MainLayout>
  );
}