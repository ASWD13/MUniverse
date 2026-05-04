"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MainLayout from "./MainLayout";
import { PrimaryButton } from "./UIElements";

type AppRole = "student" | "faculty" | "admin";

type AdminUser = {
  _id: Id<"users">;
  role: AppRole;
  fullName: string;
  email: string | null;
  department: string | null;
  enrollmentNumber: string | null;
  employeeId: string | null;
  isCurrentAdmin: boolean;
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

export default function UserRegistry() {
  const users = useQuery(api.users.listUsersForAdmin) as AdminUser[] | undefined;
  const setUserRole = useMutation(api.users.setUserRole);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [savingId, setSavingId] = useState<Id<"users"> | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!query) return true;
      return [
        user.fullName,
        user.email,
        user.role,
        user.department,
        user.enrollmentNumber,
        user.employeeId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [roleFilter, search, users]);

  const updateRole = async (userId: Id<"users">, role: AppRole) => {
    setSavingId(userId);
    setStatus(null);
    try {
      await setUserRole({ userId, role });
      setStatus("Role updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update role.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <MainLayout roleLabel="Admin">
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Authentication & Access Control</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            User Registry
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            View synced Clerk users in Convex and manage portal roles.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Users" value={users?.length ?? 0} />
          <StatCard label="Students" value={users?.filter((user) => user.role === "student").length ?? 0} />
          <StatCard label="Faculty" value={users?.filter((user) => user.role === "faculty").length ?? 0} />
          <StatCard label="Admins" value={users?.filter((user) => user.role === "admin").length ?? 0} />
        </section>

        <section className="surface-card p-5 md:p-6">
          <header>
            <p className="section-kicker">Users</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">Registered users</h2>
          </header>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Search users</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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

          {status ? <p className="mt-4 text-sm text-zinc-300">{status}</p> : null}

          {users === undefined ? (
            <p className="mt-5 text-sm text-zinc-400">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="mt-5 text-sm text-zinc-400">No users match the current search/filter.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {filteredUsers.map((user) => (
                <li key={user._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
                      <p className="truncate text-xs text-zinc-400">{user.email ?? "Email unavailable"}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em]">
                        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-zinc-200">
                          {user.role}
                        </span>
                        {user.isCurrentAdmin ? (
                          <span className="rounded-full border border-white/30 bg-white/16 px-2 py-0.5 text-white">
                            You
                          </span>
                        ) : null}
                        {user.department ? (
                          <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                            {user.department}
                          </span>
                        ) : null}
                        {user.enrollmentNumber ? (
                          <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                            {user.enrollmentNumber}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        defaultValue={user.role}
                        disabled={savingId === user._id || user.isCurrentAdmin}
                        onChange={(event) => updateRole(user._id, event.target.value as AppRole)}
                        className="h-9 cursor-pointer rounded-md border border-white/20 bg-white/10 px-2.5 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="student">student</option>
                        <option value="faculty">faculty</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 rounded-lg border border-white/15 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400">Invite flow</p>
            <p className="mt-2 text-sm text-zinc-300">
              New accounts are created through Clerk sign-in. Once a user signs in, they are synced into Convex and can be assigned a role here.
            </p>
            <PrimaryButton className="mt-4" disabled>
              Clerk invite integration pending
            </PrimaryButton>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
