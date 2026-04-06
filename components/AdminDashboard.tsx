"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MainLayout from "./MainLayout";
import { FormInput, PrimaryButton } from "./UIElements";
import { useSearchParams } from "next/navigation";

// --- COMPONENT IMPORTS ---
import AcademicHierarchy from "./AcademicHierarchy";
import CourseManager from "./CourseManager";
import ResourceAuditor from "./ResourceAuditor";
import EnrollmentManager from "./EnrollmentManager";

type AdminDashboardProps = {
  viewerName?: string;
};

type AppRole = "student" | "faculty" | "admin";

const roleOptions: Array<{ label: string; value: AppRole }> = [
  { label: "Students", value: "student" },
  { label: "Faculty", value: "faculty" },
  { label: "Admins", value: "admin" },
];

const USERS_PER_PAGE = 10;

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type StatCardProps = {
  label: string;
  value: number | string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

export default function AdminDashboard({ viewerName }: AdminDashboardProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Record<AppRole, boolean>>({
    student: true,
    faculty: true,
    admin: true,
  });
  const [isPosting, setIsPosting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<Id<"announcements"> | null>(null);
  const [isSavingRole, setIsSavingRole] = useState<Id<"users"> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole>>({});
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [formError, setFormError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const announcements = useQuery(api.announcements.getAnnouncements);
  const users = useQuery(api.users.listUsersForAdmin);
  const createAnnouncement = useMutation(api.announcements.createAnnouncement);
  const deleteAnnouncement = useMutation(api.announcements.deleteAnnouncement);
  const setUserRole = useMutation(api.users.setUserRole);

  const activeTargetRoles = roleOptions
    .filter((option) => selectedRoles[option.value])
    .map((option) => option.value);

  const handleBroadcast = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      setFormError("Title and content are required.");
      return;
    }
    setFormError(null);
    setIsPosting(true);
    try {
      await createAnnouncement({
        title: noticeTitle,
        content: noticeContent,
        targetRoles: activeTargetRoles,
      });
      setNoticeTitle("");
      setNoticeContent("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to publish notice.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (announcementId: Id<"announcements">) => {
    setIsDeleting(announcementId);
    try {
      await deleteAnnouncement({ announcementId });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveRole = async (userId: Id<"users">, currentRole: AppRole) => {
    const nextRole = roleDrafts[userId] ?? currentRole;
    if (nextRole === currentRole) return;
    setRoleError(null);
    setIsSavingRole(userId);
    try {
      await setUserRole({ userId, role: nextRole });
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : "Unable to update role.");
    } finally {
      setIsSavingRole(null);
    }
  };

  const totalAnnouncements = announcements?.length ?? 0;
  const unreadAnnouncements = announcements?.filter((item) => !item.isRead).length ?? 0;
  const readAnnouncements = totalAnnouncements - unreadAnnouncements;
  const selectedRolesCount = activeTargetRoles.length;

  const headingName = viewerName ?? "Admin";

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const search = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!search) return true;
      const searchSpace = [user.fullName, user.email, user.department, user.enrollmentNumber, user.employeeId, user.role]
        .filter(Boolean).join(" ").toLowerCase();
      return searchSpace.includes(search);
    });
  }, [roleFilter, userSearch, users]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE)), [filteredUsers.length]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [currentPage, filteredUsers]);

  useEffect(() => { setCurrentPage(1); }, [userSearch, roleFilter]);
  useEffect(() => { setCurrentPage((page) => Math.min(page, totalPages)); }, [totalPages]);

  return (
    <MainLayout roleLabel="Admin">
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Admin Workspace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            {activeTab === "dashboard" ? `Workspace Control for ${headingName}` : activeTab.replace("-", " ").toUpperCase()}
          </h1>
          {activeTab === "dashboard" && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
              Manage university communications and user permissions from a central dashboard.
            </p>
          )}
        </header>

        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <section className="grid gap-4 md:grid-cols-4">
              <StatCard label="Visible announcements" value={totalAnnouncements} />
              <StatCard label="Unread" value={unreadAnnouncements} />
              <StatCard label="Read" value={readAnnouncements} />
              <StatCard label="Targeted roles" value={selectedRolesCount} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
              <article className="surface-card p-5 md:p-6">
                <header>
                  <p className="section-kicker">Broadcast Composer</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-white">Publish message</h2>
                </header>

                <form onSubmit={handleBroadcast} className="mt-5 space-y-4">
                  <FormInput
                    label="Notice title"
                    placeholder="e.g., Holiday announcement"
                    value={noticeTitle}
                    onChange={(event) => setNoticeTitle(event.target.value)}
                  />
                  <label className="block space-y-1">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Message content</span>
                    <textarea
                      value={noticeContent}
                      onChange={(event) => setNoticeContent(event.target.value)}
                      placeholder="Describe the notice"
                      className="h-36 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/45"
                    />
                  </label>
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Audience</legend>
                    <div className="flex flex-wrap gap-2">
                      {roleOptions.map((option) => (
                        <label key={option.value} className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] ${selectedRoles[option.value] ? "border-white/50 bg-white/18 text-white" : "border-white/20 bg-white/5 text-zinc-300"}`}>
                          <input type="checkbox" checked={selectedRoles[option.value]} onChange={(e) => setSelectedRoles(curr => ({ ...curr, [option.value]: e.target.checked }))} className="sr-only" />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {formError && <p className="text-sm font-medium text-zinc-200">{formError}</p>}
                  <PrimaryButton className="w-full" type="submit" disabled={isPosting}>{isPosting ? "Publishing..." : "Publish broadcast"}</PrimaryButton>
                </form>
              </article>

              <article className="surface-card p-5 md:p-6">
                <header className="flex items-center justify-between">
                  <p className="section-kicker">Live Notice Feed</p>
                </header>
                {/* Handling loading and empty states explicitly */}
                {announcements === undefined ? (
                  <p className="mt-5 text-sm text-zinc-400">Loading notices...</p>
                ) : announcements.length === 0 ? (
                  <p className="mt-5 text-sm text-zinc-400">No notices.</p>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {announcements.map((ann) => (
                      <li key={ann._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                        <div className="flex justify-between">
                          <h3 className="font-display font-semibold text-white">{ann.title}</h3>
                          <button onClick={() => handleDelete(ann._id)} className="text-[10px] text-zinc-400 hover:text-white uppercase">Delete</button>
                        </div>
                        <p className="mt-2 text-xs text-zinc-300 line-clamp-3">{ann.content}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>
          </div>
        )}

        {activeTab === "structure" && <AcademicHierarchy />}
        {activeTab === "courses" && <CourseManager />}
        {activeTab === "resources" && <ResourceAuditor />}
        {activeTab === "enrollment" && <EnrollmentManager />}
      </div>
    </MainLayout>
  );
}