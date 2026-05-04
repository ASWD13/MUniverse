"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useUploadThing } from "@/utils/uploadthing";
import MainLayout from "./MainLayout";
import { FormInput, PrimaryButton, SecondaryButton } from "./UIElements";

type ManagedCourse = {
  _id: Id<"courses">;
  courseCode: string;
  title: string;
};

type ManagedFile = {
  _id: Id<"files">;
  resourceGroupId?: string;
  title?: string;
  description?: string;
  name?: string;
  size?: number;
  url: string;
  uploadedAt: number;
  uploadedByName: string;
  course: ManagedCourse | null;
};

type ResourceEntry = {
  id: string;
  title: string;
  description?: string;
  uploadedAt: number;
  uploadedByName: string;
  course: ManagedCourse | null;
  totalSize: number;
  files: ManagedFile[];
};

type PendingUpload = {
  id: string;
  file: File;
  name: string;
  size?: number;
  progress: number;
  status: "pending" | "uploading" | "uploaded" | "saved" | "error";
  error?: string;
};

type UploadedCourseFile = {
  fileKey?: string;
  url: string;
  name?: string;
  size?: number;
};

const MAX_FILES_PER_RESOURCE = 20;
const MAX_RESOURCE_BYTES = 256 * 1024 * 1024;

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSize(bytes?: number) {
  if (!bytes) return "Size unavailable";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

export default function ResourceManagement() {
  const { isLoaded, isSignedIn } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser, isLoaded && isSignedIn ? {} : "skip");
  const courses = useQuery(api.courses.getMyManagedCourses) as ManagedCourse[] | undefined;
  const storeCourseFile = useMutation(api.files.storeCourseFile);
  const deleteCourseFile = useMutation(api.files.deleteCourseFile);

  const [selectedCourseId, setSelectedCourseId] = useState<Id<"courses"> | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"files"> | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openEntry, setOpenEntry] = useState<ResourceEntry | null>(null);
  const activeUploadIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const files = useQuery(
    api.files.getManagedCourseFiles,
    selectedCourseId ? { courseId: selectedCourseId } : {},
  ) as ManagedFile[] | undefined;

  const selectedCourse = courses?.find((course) => course._id === selectedCourseId) ?? null;
  const resourceEntries = useMemo(() => {
    const entriesById = new Map<string, ResourceEntry>();

    for (const file of files ?? []) {
      const fallbackKey = [
        file.course?._id ?? "no-course",
        file.title ?? file.name ?? "Course resource",
        file.description ?? "",
        file.uploadedByName,
      ].join("|");
      const entryId = file.resourceGroupId ?? fallbackKey;
      const existing = entriesById.get(entryId);

      if (existing) {
        existing.files.push(file);
        existing.totalSize += file.size ?? 0;
        existing.uploadedAt = Math.max(existing.uploadedAt, file.uploadedAt);
      } else {
        entriesById.set(entryId, {
          id: entryId,
          title: file.title ?? file.name ?? "Course resource",
          description: file.description,
          uploadedAt: file.uploadedAt,
          uploadedByName: file.uploadedByName,
          course: file.course,
          totalSize: file.size ?? 0,
          files: [file],
        });
      }
    }

    return Array.from(entriesById.values()).sort((left, right) => right.uploadedAt - left.uploadedAt);
  }, [files]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resourceEntries.filter((entry) => {
      if (!query) return true;
      return [
        entry.title,
        entry.description,
        entry.course?.courseCode,
        entry.course?.title,
        entry.uploadedByName,
        ...entry.files.map((file) => file.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [resourceEntries, search]);

  const roleLabel = currentUser?.role
    ? `${currentUser.role[0].toUpperCase()}${currentUser.role.slice(1)}`
    : "Admin";

  const { startUpload } = useUploadThing("courseResourceUploader", {
    uploadProgressGranularity: "fine",
    onUploadProgress: (progress) => {
      const activeId = activeUploadIdRef.current;
      if (!activeId) return;

      setPendingUploads((current) =>
        current.map((file) =>
          file.id === activeId ? { ...file, progress, status: "uploading" } : file,
        ),
      );
    },
    onUploadError: (error) => {
      const activeId = activeUploadIdRef.current;
      if (!activeId) return;

      setPendingUploads((current) =>
        current.map((file) =>
          file.id === activeId
            ? { ...file, status: "error", error: error.message, progress: file.progress || 0 }
            : file,
        ),
      );
    },
  });

  const handleSelectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    const currentBytes = pendingUploads.reduce((sum, file) => sum + (file.size ?? 0), 0);
    const selectedBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    if (pendingUploads.length + selectedFiles.length > MAX_FILES_PER_RESOURCE) {
      setStatus(`A resource can include up to ${MAX_FILES_PER_RESOURCE} files.`);
      event.target.value = "";
      return;
    }

    if (currentBytes + selectedBytes > MAX_RESOURCE_BYTES) {
      setStatus("A resource can include up to 256 MB total.");
      event.target.value = "";
      return;
    }

    const now = Date.now();
    const nextFiles = selectedFiles.map((file, index) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${now}-${index}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: "pending" as const,
    }));

    setPendingUploads((current) => [...current, ...nextFiles]);
    setStatus(`${nextFiles.length} file${nextFiles.length === 1 ? "" : "s"} added to pending files.`);
    event.target.value = "";
  };

  const handleSubmitResource = async () => {
    setStatus(null);

    if (!selectedCourseId) {
      setStatus("Choose a course before submitting the resource.");
      return;
    }

    if (pendingUploads.length === 0) {
      setStatus("Choose at least one file before submitting.");
      return;
    }

    const resourceTitle = title.trim();
    if (!resourceTitle) {
      setStatus("Resource title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedFiles: UploadedCourseFile[] = [];
      const resourceGroupId = `resource-${selectedCourseId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      for (const pendingFile of pendingUploads) {
        if (pendingFile.status === "saved") {
          continue;
        }

        activeUploadIdRef.current = pendingFile.id;
        setPendingUploads((current) =>
          current.map((file) =>
            file.id === pendingFile.id
              ? { ...file, status: "uploading", progress: Math.max(file.progress, 1), error: undefined }
              : file,
          ),
        );

        const uploaded = await startUpload([pendingFile.file]);
        const uploadedFile = uploaded?.[0];

        const url =
          uploadedFile && "ufsUrl" in uploadedFile && typeof uploadedFile.ufsUrl === "string"
            ? uploadedFile.ufsUrl
            : uploadedFile && "url" in uploadedFile && typeof uploadedFile.url === "string"
              ? uploadedFile.url
              : "";

        if (!uploadedFile || !url) {
          throw new Error(`Upload failed for ${pendingFile.name}`);
        }

        const fileKey = "key" in uploadedFile && typeof uploadedFile.key === "string" ? uploadedFile.key : undefined;
        const name = "name" in uploadedFile && typeof uploadedFile.name === "string" ? uploadedFile.name : pendingFile.name;
        const size = "size" in uploadedFile && typeof uploadedFile.size === "number" ? uploadedFile.size : pendingFile.size;

        setPendingUploads((current) =>
          current.map((file) =>
            file.id === pendingFile.id ? { ...file, status: "uploaded", progress: 100 } : file,
          ),
        );

        await storeCourseFile({
          courseId: selectedCourseId,
          resourceGroupId,
          fileKey,
          url,
          title: resourceTitle,
          description: description.trim() || undefined,
          name,
          size,
        });

        setPendingUploads((current) =>
          current.map((file) =>
            file.id === pendingFile.id ? { ...file, status: "saved", progress: 100 } : file,
          ),
        );

        uploadedFiles.push({ fileKey, url, name, size });
      }

      setStatus(
        `Submitted ${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} to ${selectedCourse?.courseCode ?? "course"}.`,
      );
      setTitle("");
      setDescription("");
      setPendingUploads([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit resource.");
    } finally {
      activeUploadIdRef.current = null;
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout roleLabel={roleLabel}>
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Resource Management</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            Course Resource Library
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Upload files to courses you manage. Enrolled students will see these resources on their dashboard.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Managed Courses" value={courses?.length ?? 0} />
          <StatCard label="Resource Entries" value={resourceEntries.length} />
          <StatCard label="Filtered Results" value={filteredEntries.length} />
          <StatCard label="Workspace" value={roleLabel} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Upload</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">Add course file</h2>
            </header>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Course</span>
                <select
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value as Id<"courses"> | "")}
                  className="h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Choose a course</option>
                  {(courses ?? []).map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseCode} · {course.title}
                    </option>
                  ))}
                </select>
              </label>

              <FormInput
                label="Resource title"
                placeholder="e.g., Module 4 lecture notes"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />

              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                />
              </label>

              <section className="rounded-lg border border-white/15 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Pending files</p>
                    <p className="mt-1 text-xs text-zinc-500">Selected files and upload progress appear here before the resource is saved.</p>
                  </div>
                  {pendingUploads.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPendingUploads([])}
                      disabled={isSubmitting}
                      className="h-8 rounded-md border border-white/20 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                {pendingUploads.length === 0 ? (
                  <p className="mt-4 rounded-md border border-dashed border-white/15 bg-black/20 px-3 py-4 text-center text-sm text-zinc-400">
                    No files selected for this resource yet.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {pendingUploads.map((file) => (
                      <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{file.name ?? "Uploaded file"}</p>
                          <p className="text-xs text-zinc-400">
                            {formatSize(file.size)} · {file.status === "pending" ? "Waiting" : file.status === "uploading" ? `Uploading ${Math.round(file.progress)}%` : file.status === "uploaded" ? "Saving" : file.status === "saved" ? "Saved" : "Failed"}
                          </p>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                            <div
                              className="h-full rounded-full bg-white transition-all"
                              style={{ width: `${Math.max(0, Math.min(100, file.progress))}%` }}
                            />
                          </div>
                          {file.error ? <p className="mt-1 text-xs text-red-300">{file.error}</p> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPendingUploads((current) => current.filter((item) => item.id !== file.id))}
                            disabled={isSubmitting || file.status === "uploading"}
                            className="h-8 rounded-md border border-white/20 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <div className="rounded-lg border border-dashed border-white/20 bg-black/20 px-4 py-8 text-center">
                  <span className="block text-sm font-semibold text-white">Choose files</span>
                  <span className="mt-1 block text-xs text-zinc-500">Files are added to pending list and upload only after Submit Resource.</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Select Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleSelectFiles}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                </div>
              </div>

              <PrimaryButton
                className="w-full"
                onClick={handleSubmitResource}
                disabled={isSubmitting || !selectedCourseId || pendingUploads.length === 0}
              >
                {isSubmitting ? "Submitting..." : "Submit Resource"}
              </PrimaryButton>

              {status ? <p className="text-sm font-medium text-zinc-200">{status}</p> : null}
            </div>
          </article>

          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Browser</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">Uploaded files</h2>
            </header>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
              <FormInput
                label="Search"
                placeholder="Search by title, course, uploader"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Course filter</span>
                <select
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value as Id<"courses"> | "")}
                  className="h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                >
                  <option value="">All managed courses</option>
                  {(courses ?? []).map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseCode}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {files === undefined ? (
              <p className="mt-5 text-sm text-zinc-400">Loading files...</p>
            ) : filteredEntries.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-400">No resources match this view.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {filteredEntries.map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-semibold text-white">
                          {entry.title}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-400">
                          {entry.course ? `${entry.course.courseCode} · ${entry.course.title}` : "No course"} · {entry.files.length} file{entry.files.length === 1 ? "" : "s"} · {formatSize(entry.totalSize)} · {formatDate(entry.uploadedAt)}
                        </p>
                        {entry.description ? <p className="mt-2 text-sm text-zinc-300">{entry.description}</p> : null}
                        <p className="mt-2 text-xs text-zinc-500">Uploaded by {entry.uploadedByName}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenEntry(entry)}
                          className="inline-flex h-8 items-center rounded-md border border-white/20 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Open
                        </button>
                        <SecondaryButton
                          className="h-8 px-3 text-xs"
                          disabled={entry.files.some((file) => deletingId === file._id)}
                          onClick={async () => {
                            try {
                              for (const file of entry.files) {
                                setDeletingId(file._id);
                                await deleteCourseFile({ fileId: file._id });
                              }
                              setStatus("Resource removed.");
                            } catch (error) {
                              setStatus(error instanceof Error ? error.message : "Unable to delete resource.");
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                        >
                          {entry.files.some((file) => deletingId === file._id) ? "Deleting..." : "Delete"}
                        </SecondaryButton>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        {openEntry ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-zinc-950 p-5 shadow-2xl">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="section-kicker">Resource Files</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-white">{openEntry.title}</h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    {openEntry.course ? `${openEntry.course.courseCode} · ${openEntry.course.title}` : "No course"} · {openEntry.files.length} file{openEntry.files.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenEntry(null)}
                  className="h-9 rounded-md border border-white/20 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-white/10"
                >
                  Close
                </button>
              </header>

              {openEntry.description ? (
                <p className="mt-4 text-sm text-zinc-300">{openEntry.description}</p>
              ) : null}

              <ul className="mt-5 space-y-3">
                {openEntry.files.map((file) => (
                  <li key={file._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/15 bg-white/5 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{file.name ?? file.title ?? "Course file"}</p>
                      <p className="mt-1 text-xs text-zinc-400">{formatSize(file.size)} · {formatDate(file.uploadedAt)}</p>
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center rounded-md border border-white/20 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                      Open file
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
}
