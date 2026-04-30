"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { UploadButton } from "@/utils/uploadthing";

type UploadedFile = {
  key?: string;
  name?: string;
  url?: string;
  ufsUrl?: string;
  size?: number;
  serverData?: unknown;
};

type UploadPhase = "idle" | "preparing" | "uploading" | "success" | "error";

type EventEntry = {
  id: number;
  message: string;
  tone: "neutral" | "success" | "error";
};

function getFileUrl(file: UploadedFile) {
  return file.ufsUrl ?? file.url ?? null;
}

function getRecordedFileUrl(file: UploadedFile) {
  return file.ufsUrl ?? null;
}

export default function UploadTestPage() {
  const { user } = useUser();
  const recordFileInConvex = useMutation(api.files.storeFileForCurrentUser);
  const serverFilesResult = useQuery(api.files.getCurrentUserFiles, user ? {} : "skip");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [status, setStatus] = useState("Waiting for upload.");
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);

  const addEvent = (message: string, tone: EventEntry["tone"] = "neutral") => {
    setEvents((current) => [
      {
        id: Date.now() + current.length,
        message,
        tone,
      },
      ...current,
    ].slice(0, 8));
  };

  const recordFilesInConvex = async (files: UploadedFile[]) => {
    let recordedCount = 0;

    for (const file of files) {
      const url = getRecordedFileUrl(file);
      if (!url) {
        continue;
      }

      await recordFileInConvex({
        fileKey: file.key,
        url,
        name: file.name,
        size: file.size,
      });
      recordedCount += 1;
    }

    if (recordedCount === 0) {
      throw new Error("No `ufsUrl` values were returned from UploadThing, so nothing could be recorded in Convex.");
    }
  };

  return (
    <main className="p-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-zinc-900/60 p-6">
        <h1 className="mb-2 text-2xl font-bold">UploadThing Test Page</h1>
        <p className="mb-6 text-sm text-zinc-300">
          Signed in as: {user?.id ?? "Not signed in"}.
          {" "}
          This route currently allows `admin` and `faculty` users only.
        </p>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <UploadButton
              endpoint="imageUploader"
              content={{
                button({ ready }) {
                  return ready ? "Select files" : "Preparing uploader";
                },
                allowedContent() {
                  return "Images up to 4MB, maximum 5 files";
                },
              }}
              onBeforeUploadBegin={(files) => {
                setPhase("preparing");
                setProgress(0);
                setUploadedFiles([]);
                setStatus(`Preparing ${files.length} file${files.length === 1 ? "" : "s"} for upload.`);
                addEvent(`Preparing ${files.length} file${files.length === 1 ? "" : "s"} for upload.`);
                return files;
              }}
              onUploadBegin={(fileName) => {
                setPhase("uploading");
                setStatus(`Uploading ${fileName}...`);
                addEvent(`Upload started for ${fileName}.`);
              }}
              onUploadProgress={(value) => {
                setPhase("uploading");
                setProgress(value);
                setStatus(`Uploading... ${value}%`);
              }}
              onClientUploadComplete={(files) => {
                setPhase("success");
                setProgress(100);
                setUploadedFiles(files as UploadedFile[]);
                setStatus(
                  `Upload finished. ${files.length} file${files.length === 1 ? "" : "s"} uploaded successfully.`,
                );
                addEvent("Client upload callback completed.", "success");
                void recordFilesInConvex(files as UploadedFile[])
                  .then(() => {
                    addEvent("Files recorded in Convex.", "success");
                  })
                  .catch((error) => {
                    addEvent(
                      error instanceof Error
                        ? `Upload succeeded, but Convex recording failed: ${error.message}`
                        : "Upload succeeded, but Convex recording failed.",
                      "error",
                    );
                    setPhase("error");
                    setStatus(
                      error instanceof Error
                        ? `Upload finished, but Convex recording failed: ${error.message}`
                        : "Upload finished, but Convex recording failed.",
                    );
                  });
              }}
              onUploadError={(error) => {
                setPhase("error");
                setProgress(0);
                setStatus(`Upload failed: ${error.message}`);
                addEvent(`Upload failed: ${error.message}`, "error");
              }}
            />

            <button
              onClick={() => {
                setEvents([]);
                setStatus("Waiting for upload.");
                setPhase("idle");
                setProgress(0);
                setUploadedFiles([]);
              }}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-100 hover:bg-white/5"
              type="button"
            >
              Clear status
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{status}</span>
              <span
                className={
                  phase === "error"
                    ? "text-red-400"
                    : phase === "success"
                      ? "text-emerald-400"
                      : "text-zinc-400"
                }
              >
                {phase}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={
                  phase === "error"
                    ? "h-full bg-red-500 transition-all"
                    : "h-full bg-emerald-400 transition-all"
                }
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-xs text-zinc-400">
              Uploads go through the shared UploadThing route, and this page reads stored files directly from Convex.
            </p>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Recent events</h2>
          <div className="mt-3 space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-zinc-400">No upload events yet.</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <span
                    className={
                      event.tone === "error"
                        ? "text-red-400"
                        : event.tone === "success"
                          ? "text-emerald-400"
                          : "text-zinc-200"
                    }
                  >
                    {event.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Client result</h2>
          {uploadedFiles.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No uploaded files captured yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {uploadedFiles.map((file, index) => {
                const fileUrl = getFileUrl(file);

                return (
                  <div key={`${file.key ?? file.name ?? "file"}-${index}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="font-medium text-zinc-100">{file.name ?? `File ${index + 1}`}</p>
                    {fileUrl ? (
                      <a
                        className="mt-1 block break-all text-sm text-blue-300 underline"
                        href={fileUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {fileUrl}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-zinc-400">No file URL returned to the client.</p>
                    )}
                    <pre className="mt-3 overflow-auto rounded bg-black/40 p-3 text-xs text-zinc-300">
                      {JSON.stringify(file, null, 2)}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Server records (Convex)</h2>
            <button
              onClick={() => {
                addEvent("Server records update automatically from Convex.");
              }}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-100 hover:bg-white/5"
              type="button"
            >
              Check Convex status
            </button>
          </div>

          <div className="mt-3">
            {serverFilesResult === undefined ? (
              <p className="text-sm text-zinc-400">Loading stored files from Convex...</p>
            ) : serverFilesResult.length === 0 ? (
              <p className="text-sm text-zinc-400">No stored files found for this user.</p>
            ) : (
              <div className="space-y-2">
                {serverFilesResult.map((file) => (
                  <div key={file._id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <a
                      className="block break-all text-sm text-blue-300 underline"
                      href={file.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {file.name ?? file.url}
                    </a>
                    <p className="mt-1 text-xs text-zinc-400">{file.size ?? "Unknown"} bytes</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
