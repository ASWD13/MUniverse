"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MainLayout from "./MainLayout";
import { FormInput, PrimaryButton } from "./UIElements";

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

    if (activeTargetRoles.length === 0) {
      setFormError("Select at least one audience role.");
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

    if (nextRole === currentRole) {
      return;
    }

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
    if (!users) {
      return [];
    }

    const search = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchSpace = [
        user.fullName,
        user.email,
        user.department,
        user.enrollmentNumber,
        user.employeeId,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchSpace.includes(search);
    });
  }, [roleFilter, userSearch, users]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE)),
    [filteredUsers.length],
  );

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [currentPage, filteredUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, roleFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <MainLayout roleLabel="Admin">
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Admin Workspace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            Communication control for {headingName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Publish announcements across roles, monitor read state, and remove outdated notices in
            one streamlined console.
          </p>
        </header>

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
              <p className="mt-2 text-sm text-zinc-300">
                Create one announcement and select who should receive it.
              </p>
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
                  className="h-36 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                  Audience
                </legend>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((option) => {
                    const checked = selectedRoles[option.value];

                    return (
                      <label
                        key={option.value}
                        className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] ${checked ? "border-white/50 bg-white/18 text-white" : "border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setSelectedRoles((current) => ({
                              ...current,
                              [option.value]: event.target.checked,
                            }))
                          }
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {formError ? <p className="text-sm font-medium text-zinc-200">{formError}</p> : null}

              <PrimaryButton className="w-full" type="submit" disabled={isPosting}>
                {isPosting ? "Publishing..." : "Publish broadcast"}
              </PrimaryButton>
            </form>
          </article>

          <article className="surface-card p-5 md:p-6">
            <header className="flex items-center justify-between">
              <div>
                <p className="section-kicker">Live Notice Feed</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Admin stream</h2>
              </div>
              <p className="text-sm text-zinc-400">Visible to admin role</p>
            </header>

            {announcements === undefined ? (
              <p className="mt-5 text-sm text-zinc-400">Loading notice feed...</p>
            ) : announcements.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-400">No announcements published yet.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {announcements.map((announcement) => (
                  <li key={announcement._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <header className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-white">{announcement.title}</h3>
                        <p className="mt-1 text-xs text-zinc-400">Updated {formatDate(announcement.updatedAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(announcement._id)}
                        disabled={isDeleting === announcement._id}
                        className="h-8 cursor-pointer rounded-md border border-white/25 px-3 text-xs font-medium text-white transition hover:bg-white/12 active:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting === announcement._id ? "Deleting..." : "Delete"}
                      </button>
                    </header>

                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                      {announcement.content}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {announcement.targetRoles.map((role) => (
                        <span
                          key={`${announcement._id}-${role}`}
                          className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase text-zinc-200"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="surface-card p-5 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="section-kicker">Role Management</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">Assign user roles</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Update user access levels for testing and administration.
              </p>
            </div>
          </header>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Search users</span>
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name, email, role, department"
                className="h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Role filter</span>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "all" | AppRole)}
                className="h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
              >
                <option value="all">all roles</option>
                <option value="admin">admin</option>
                <option value="faculty">faculty</option>
                <option value="student">student</option>
              </select>
            </label>
          </div>

          <p className="mt-3 text-xs text-zinc-400">
            Showing {filteredUsers.length} of {users?.length ?? 0} users
          </p>

          {roleError ? <p className="mt-4 text-sm font-medium text-zinc-200">{roleError}</p> : null}

          {users === undefined ? (
            <p className="mt-5 text-sm text-zinc-400">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="mt-5 text-sm text-zinc-400">No users found in database.</p>
          ) : filteredUsers.length === 0 ? (
            <p className="mt-5 text-sm text-zinc-400">No users match the current search/filter.</p>
          ) : (
            <>
              <ul className="mt-5 space-y-3">
                {paginatedUsers.map((user) => {
                  const draftRole = roleDrafts[user._id] ?? user.role;
                  const isBusy = isSavingRole === user._id;
                  const isProtectedAdminSelf = user.isCurrentAdmin && user.role === "admin";

                  return (
                    <li
                      key={user._id}
                      className="rounded-lg border border-white/15 bg-white/5 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
                          <p className="truncate text-xs text-zinc-400">
                            {user.email ?? "Email not available"}
                          </p>
                          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em]">
                            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-zinc-200">
                              {user.role}
                            </span>
                            {user.isCurrentAdmin ? (
                              <span className="rounded-full border border-white/30 bg-white/16 px-2 py-0.5 text-white">
                                You
                              </span>
                            ) : null}
                            {isProtectedAdminSelf ? (
                              <span className="rounded-full border border-white/30 bg-white/16 px-2 py-0.5 text-white">
                                Protected
                              </span>
                            ) : null}
                            {user.department ? (
                              <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                                {user.department}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={draftRole}
                            onChange={(event) =>
                              setRoleDrafts((current) => ({
                                ...current,
                                [user._id]: event.target.value as AppRole,
                              }))
                            }
                            disabled={isBusy || isProtectedAdminSelf}
                            className="h-9 cursor-pointer rounded-md border border-white/20 bg-white/10 px-2.5 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                          >
                            <option value="student">student</option>
                            <option value="faculty">faculty</option>
                            <option value="admin">admin</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleSaveRole(user._id, user.role)}
                            disabled={isBusy || draftRole === user.role || isProtectedAdminSelf}
                            className="h-9 cursor-pointer rounded-md border border-white/25 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-white/12 active:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSavingRole === user._id ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
                <p className="text-xs text-zinc-400">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="h-8 cursor-pointer rounded-md border border-white/20 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/10 active:bg-white/16 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 cursor-pointer rounded-md border border-white/20 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/10 active:bg-white/16 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
