"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import MainLayout from "./MainLayout";
import { FormInput, PrimaryButton } from "./UIElements";

type AppRole = "student" | "faculty" | "admin";
type Department = "CSE" | "ECE" | "MECH" | "MBA";

type User = {
  id: number;
  fullName: string;
  email: string;
  role: AppRole;
  department: Department;
  verified: boolean;
  registeredOn: string;
  isCurrentUser: boolean;
  isProtected: boolean;
};

const USERS_PER_PAGE = 5;

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

const INITIAL_USERS: User[] = [
  { id: 1, fullName: "varshneya Kolla", email: "se23ucse089@mahindrauniversity.edu.in", role: "admin", department: "CSE", verified: true, registeredOn: "1 Feb 2026", isCurrentUser: true, isProtected: true },
  { id: 2, fullName: "Rohith Rathod", email: "se23ucse034@mahindrauniversity.edu.in", role: "admin", department: "CSE", verified: true, registeredOn: "1 Feb 2026", isCurrentUser: false, isProtected: false },
  { id: 3, fullName: "boing boing", email: "se23ucse044@mahindrauniversity.edu.in", role: "admin", department: "CSE", verified: true, registeredOn: "3 Feb 2026", isCurrentUser: false, isProtected: false },
  { id: 4, fullName: "a b", email: "se23ucse093@mahindrauniversity.edu.in", role: "admin", department: "CSE", verified: true, registeredOn: "3 Feb 2026", isCurrentUser: false, isProtected: false },
  { id: 5, fullName: "Sai Pavan Mandapaka", email: "se23ucse107@mahindrauniversity.edu.in", role: "admin", department: "CSE", verified: true, registeredOn: "4 Feb 2026", isCurrentUser: false, isProtected: false },
  { id: 6, fullName: "hmm hmmmm", email: "se23ucse044b@mahindrauniversity.edu.in", role: "admin", department: "CSE", verified: false, registeredOn: "10 Mar 2026", isCurrentUser: false, isProtected: false },
  { id: 7, fullName: "Andy Murray", email: "se23ucse017@mahindrauniversity.edu.in", role: "admin", department: "CSE", verified: true, registeredOn: "15 Mar 2026", isCurrentUser: false, isProtected: false },
];

const RBAC_ROWS = [
  { label: "Student access", value: "Dashboard, Resources, Notices (read)" },
  { label: "Faculty access", value: "+ Post Announcements, Upload Resources" },
  { label: "Admin access", value: "Full system — all routes unlocked" },
  { label: "Auth method", value: "Password hash + OTP email verification" },
  { label: "Middleware", value: "RBAC authorisation on every API route" },
];

export default function UserRegistry() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("student");
  const [newDept, setNewDept] = useState<Department>("CSE");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRemoving, setIsRemoving] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return [u.fullName, u.email, u.role, u.department]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [users, search, roleFilter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE)),
    [filteredUsers.length]
  );

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [currentPage, filteredUsers]);

  useEffect(() => { setCurrentPage(1); }, [search, roleFilter]);
  useEffect(() => { setCurrentPage((p) => Math.min(p, totalPages)); }, [totalPages]);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setFormError("Full name and email are required.");
      return;
    }
    setFormError(null);
    setIsRegistering(true);
    await new Promise((r) => setTimeout(r, 600));
    setUsers((prev) => [
      {
        id: Date.now(),
        fullName: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        department: newDept,
        verified: false,
        registeredOn: "1 May 2026",
        isCurrentUser: false,
        isProtected: false,
      },
      ...prev,
    ]);
    setNewName("");
    setNewEmail("");
    setIsRegistering(false);
  };

  const handleRemove = async (id: number) => {
    setIsRemoving(id);
    await new Promise((r) => setTimeout(r, 400));
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setIsRemoving(null);
  };

  return (
    <MainLayout roleLabel="Admin">
      <div className="w-full space-y-6">

        {/* Header */}
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Authentication & Access Control</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            User Registry
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            View all registered university users, manage OTP verification status, and register new accounts into the MUniverse database.
          </p>
        </header>

        {/* Stat cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Users" value={users.length} />
          <StatCard label="Verified" value={users.filter((u) => u.verified).length} />
          <StatCard label="Unverified" value={users.filter((u) => !u.verified).length} />
          <StatCard label="Targeted Roles" value={new Set(users.map((u) => u.role)).size} />
        </section>

        {/* Register form + User table */}
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">

          {/* Register panel */}
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Registration</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">Register New User</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Add a university member to the MUniverse database. An OTP will be dispatched on registration.
              </p>
            </header>

            <form onSubmit={handleRegister} className="mt-5 space-y-4">
              <FormInput
                label="Full Name"
                placeholder="e.g., Harshith Alluri"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />

              <FormInput
                label="University Email"
                placeholder="seXXucseXXX@mahindrauniversity.edu.in"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Role</span>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AppRole)}
                  className="h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                >
                  <option value="student">student</option>
                  <option value="faculty">faculty</option>
                  <option value="admin">admin</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Department</span>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value as Department)}
                  className="h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                >
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="MECH">MECH</option>
                  <option value="MBA">MBA</option>
                </select>
              </label>

              {formError ? (
                <p className="text-sm font-medium text-zinc-200">{formError}</p>
              ) : null}

              <PrimaryButton className="w-full" type="submit" disabled={isRegistering}>
                {isRegistering ? "Registering..." : "Register & Send OTP"}
              </PrimaryButton>
            </form>

            {/* RBAC schema */}
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="section-kicker mb-4">RBAC Schema</p>
              <ul className="space-y-2">
                {RBAC_ROWS.map((row) => (
                  <li
                    key={row.label}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3"
                  >
                    <p className="text-xs text-zinc-400">{row.label}</p>
                    <p className="text-xs font-medium text-zinc-200">{row.value}</p>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {/* User table */}
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">User Table</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">All Registered Users</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Search by name, email, role, or department.
              </p>
            </header>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Search users</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, role, department"
                  className="h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Role filter</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as "all" | AppRole)}
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
              Showing {filteredUsers.length} of {users.length} users
            </p>

            {paginatedUsers.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-400">No users match the current search/filter.</p>
            ) : (
              <>
                <ul className="mt-4 space-y-3">
                  {paginatedUsers.map((user) => (
                    <li key={user.id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
                          <p className="truncate text-xs text-zinc-400">{user.email}</p>
                          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em]">
                            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-zinc-200">
                              {user.role}
                            </span>
                            {user.isCurrentUser ? (
                              <span className="rounded-full border border-white/30 bg-white/16 px-2 py-0.5 text-white">
                                You
                              </span>
                            ) : null}
                            {user.isProtected ? (
                              <span className="rounded-full border border-white/30 bg-white/16 px-2 py-0.5 text-white">
                                Protected
                              </span>
                            ) : null}
                            <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                              {user.department}
                            </span>
                            <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                              {user.verified ? "Verified" : "Unverified"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemove(user.id)}
                            disabled={user.isProtected || user.isCurrentUser || isRemoving === user.id}
                            className="h-8 cursor-pointer rounded-md border border-white/25 px-3 text-xs font-medium text-white transition hover:bg-white/12 active:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isRemoving === user.id ? "Removing..." : "Remove"}
                          </button>
                          <p className="text-xs text-zinc-400">Joined {user.registeredOn}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
                  <p className="text-xs text-zinc-400">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 cursor-pointer rounded-md border border-white/20 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/10 active:bg-white/16 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 cursor-pointer rounded-md border border-white/20 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/10 active:bg-white/16 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </article>
        </section>
      </div>
    </MainLayout>
  );
}