"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import MainLayout from "./MainLayout";
import { PrimaryButton } from "./UIElements";

type AppRole = "student" | "faculty" | "admin";

type SessionPolicy = {
  idleTimeoutMinutes: number;
  tokenExpiryHours: number;
  maxConcurrentSessions: number;
  sharedWarning: boolean;
  autoLogout: boolean;
  rememberDevice: boolean;
  updatedAt: number | null;
};

type NumericPolicyKey = "idleTimeoutMinutes" | "tokenExpiryHours" | "maxConcurrentSessions";
type BooleanPolicyKey = "sharedWarning" | "autoLogout" | "rememberDevice";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return "Not saved yet";
  return new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SessionManagement() {
  const users = useQuery(api.users.listUsersForAdmin);
  const policy = useQuery(api.users.getSessionPolicyForAdmin);
  const updatePolicy = useMutation(api.users.updateSessionPolicyForAdmin);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [form, setForm] = useState<SessionPolicy>({
    idleTimeoutMinutes: 30,
    tokenExpiryHours: 24,
    maxConcurrentSessions: 3,
    sharedWarning: true,
    autoLogout: true,
    rememberDevice: false,
    updatedAt: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!policy) return;
    setForm({
      idleTimeoutMinutes: policy.idleTimeoutMinutes,
      tokenExpiryHours: policy.tokenExpiryHours,
      maxConcurrentSessions: policy.maxConcurrentSessions,
      sharedWarning: policy.sharedWarning,
      autoLogout: policy.autoLogout,
      rememberDevice: policy.rememberDevice,
      updatedAt: policy.updatedAt,
    });
  }, [policy]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const searchable = [
        user.fullName,
        user.email ?? "",
        user.enrollmentNumber ?? "",
        user.employeeId ?? "",
        user.department ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return matchesRole && (!needle || searchable.includes(needle));
    });
  }, [roleFilter, search, users]);

  const roleCounts = useMemo(
    () => ({
      admin: users?.filter((user) => user.role === "admin").length ?? 0,
      faculty: users?.filter((user) => user.role === "faculty").length ?? 0,
      student: users?.filter((user) => user.role === "student").length ?? 0,
    }),
    [users],
  );

  const saveConfig = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await updatePolicy({
        idleTimeoutMinutes: form.idleTimeoutMinutes,
        tokenExpiryHours: form.tokenExpiryHours,
        maxConcurrentSessions: form.maxConcurrentSessions,
        sharedWarning: form.sharedWarning,
        autoLogout: form.autoLogout,
        rememberDevice: form.rememberDevice,
      });
      setMessage("Configuration saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout roleLabel="Admin">
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Security Management</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            Session Control
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Configure session policy for the platform and inspect synced user accounts from Convex.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Synced Users" value={users?.length ?? 0} />
          <StatCard label="Admins" value={roleCounts.admin} />
          <StatCard label="Faculty" value={roleCounts.faculty} />
          <StatCard label="Students" value={roleCounts.student} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <article className="surface-card p-5 md:p-6">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="section-kicker">Synced Accounts</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">User session scope</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  Convex stores policy and user metadata. Live session revocation should be backed by Clerk session APIs.
                </p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200">
                Auth by Clerk
              </span>
            </header>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Search users</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, roll number"
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
              Showing {filteredUsers.length} of {users?.length ?? 0} synced accounts
            </p>

            {users === undefined ? (
              <p className="mt-5 text-sm text-zinc-400">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-400">No users match the current filters.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {filteredUsers.map((user) => (
                  <li key={user._id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {user.fullName}
                          {user.isCurrentAdmin ? " (you)" : ""}
                        </p>
                        <p className="truncate text-xs text-zinc-400">{user.email ?? "No email synced"}</p>
                        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em]">
                          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-zinc-200">
                            {user.role}
                          </span>
                          {user.enrollmentNumber ? (
                            <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                              {user.enrollmentNumber}
                            </span>
                          ) : null}
                          {user.employeeId ? (
                            <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                              {user.employeeId}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Security Configuration</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">Timeout settings</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Persist idle timeout and trusted-device policy in Convex for server-side enforcement hooks.
              </p>
            </header>

            <div className="mt-5 space-y-4">
              {([
                ["Idle Timeout (minutes)", "idleTimeoutMinutes", 5, 120],
                ["Session Token Expiry (hours)", "tokenExpiryHours", 1, 72],
                ["Max Concurrent Sessions per User", "maxConcurrentSessions", 1, 10],
              ] as Array<[string, NumericPolicyKey, number, number]>).map(([label, key, min, max]) => (
                <label key={String(key)} className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</span>
                  <input
                    type="number"
                    min={Number(min)}
                    max={Number(max)}
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  />
                </label>
              ))}

              <div className="border-t border-white/10 pt-4">
                <p className="section-kicker mb-3">Toggle Policies</p>
                <div className="space-y-2">
                  {([
                    ["sharedWarning", "Shared Computer Warning", "Prompt users to log out on public devices", form.sharedWarning],
                    ["autoLogout", "Auto-Logout on Idle", "Terminate sessions after timeout period", form.autoLogout],
                    ["rememberDevice", "Remember Device (30 days)", "Skip OTP for trusted personal devices", form.rememberDevice],
                  ] as Array<[BooleanPolicyKey, string, string, boolean]>).map(([key, label, sub, value]) => (
                    <label key={String(key)} className="flex cursor-pointer items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            [key]: !current[key],
                          }))
                        }
                        className="sr-only"
                      />
                      <div
                        className={`relative h-5 w-9 rounded-full border transition-colors ${
                          value ? "border-white/30 bg-white/20" : "border-white/15 bg-white/6"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            value ? "translate-x-4" : "translate-x-0.5"
                          }`}
                          style={{ opacity: value ? 1 : 0.4 }}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-xs text-zinc-400">Last saved: {formatDate(form.updatedAt)}</p>
              {message ? <p className="text-sm font-medium text-zinc-200">{message}</p> : null}

              <PrimaryButton className="w-full" onClick={saveConfig} disabled={isSaving || policy === undefined}>
                {isSaving ? "Saving..." : "Save configuration"}
              </PrimaryButton>
            </div>
          </article>
        </section>
      </div>
    </MainLayout>
  );
}
