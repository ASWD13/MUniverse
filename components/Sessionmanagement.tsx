"use client";

import { useState } from "react";
import MainLayout from "./MainLayout";
import { PrimaryButton } from "./UIElements";

type SessionStatus = "active" | "idle" | "expired";
type AppRole = "student" | "faculty" | "admin";
type OtpStatus = "used" | "expired" | "pending";

type Session = {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  status: SessionStatus;
  device: string;
  lastSeen: string;
  isCurrentUser: boolean;
};

type OtpEntry = {
  id: number;
  email: string;
  time: string;
  status: OtpStatus;
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="surface-card p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

const INITIAL_SESSIONS: Session[] = [
  { id: 1, name: "varshneya Kolla", email: "se23ucse089@mahindrauniversity.edu.in", role: "admin", status: "active", device: "MacBook, Brave", lastSeen: "Active now", isCurrentUser: true },
  { id: 2, name: "Rohith Rathod", email: "se23ucse034@mahindrauniversity.edu.in", role: "admin", status: "active", device: "Windows, Chrome", lastSeen: "2 min ago", isCurrentUser: false },
  { id: 3, name: "Sai Pavan Mandapaka", email: "se23ucse107@mahindrauniversity.edu.in", role: "admin", status: "idle", device: "iPhone, Safari", lastSeen: "18 min ago", isCurrentUser: false },
  { id: 4, name: "Andy Murray", email: "se23ucse017@mahindrauniversity.edu.in", role: "student", status: "active", device: "Android, Firefox", lastSeen: "5 min ago", isCurrentUser: false },
  { id: 5, name: "Anshika Mishra", email: "se23ucse027@mahindrauniversity.edu.in", role: "faculty", status: "expired", device: "MacBook, Chrome", lastSeen: "2 hr ago", isCurrentUser: false },
];

const OTP_LOG: OtpEntry[] = [
  { id: 1, email: "se23ucse089@mahindrauniversity.edu.in", time: "1 May 2026, 3:39 pm", status: "used" },
  { id: 2, email: "se23ucse034@mahindrauniversity.edu.in", time: "1 May 2026, 3:35 pm", status: "used" },
  { id: 3, email: "se23ucse107@mahindrauniversity.edu.in", time: "1 May 2026, 3:20 pm", status: "used" },
  { id: 4, email: "new.user@mahindrauniversity.edu.in", time: "1 May 2026, 3:10 pm", status: "expired" },
  { id: 5, email: "se23ucse027@mahindrauniversity.edu.in", time: "1 May 2026, 2:55 pm", status: "pending" },
];

export default function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [idleTimeout, setIdleTimeout] = useState("30");
  const [tokenExpiry, setTokenExpiry] = useState("24");
  const [maxConcurrent, setMaxConcurrent] = useState("3");
  const [sharedWarning, setSharedWarning] = useState(true);
  const [autoLogout, setAutoLogout] = useState(true);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState<number | null>(null);

  const filtered = sessions.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  const forceLogout = async (id: number) => {
    setIsLoggingOut(id);
    await new Promise((r) => setTimeout(r, 500));
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "expired" as SessionStatus } : s))
    );
    setIsLoggingOut(null);
  };

  const forceLogoutAll = () => {
    setSessions((prev) =>
      prev.map((s) => (s.isCurrentUser ? s : { ...s, status: "expired" as SessionStatus }))
    );
  };

  const saveConfig = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const otpStatusClasses: Record<OtpStatus, string> = {
    used: "border-white/20 bg-white/10 text-zinc-200",
    expired: "border-white/15 bg-white/5 text-zinc-500",
    pending: "border-white/20 bg-white/10 text-zinc-200",
  };

  return (
    <MainLayout roleLabel="Admin">
      <div className="w-full space-y-6">

        {/* Header */}
        <header className="surface-card motion-enter p-6 md:p-7">
          <p className="section-kicker">Security Management</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
            Session Control
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            Monitor active logins, enforce timeouts for inactive sessions, and protect shared campus computers.
          </p>
        </header>

        {/* Stat cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Active Sessions" value={sessions.filter((s) => s.status === "active").length} />
          <StatCard label="Idle Sessions" value={sessions.filter((s) => s.status === "idle").length} />
          <StatCard label="Expired Today" value={sessions.filter((s) => s.status === "expired").length} />
          <StatCard label="OTP Dispatched" value={OTP_LOG.length} />
        </section>

        {/* Sessions feed + Config */}
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">

          {/* Live Sessions */}
          <article className="surface-card p-5 md:p-6">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="section-kicker">Live Session Feed</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Active Logins</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  Force-logout suspicious or inactive sessions.
                </p>
              </div>
              <button
                type="button"
                onClick={forceLogoutAll}
                className="h-8 cursor-pointer rounded-md border border-white/25 px-3 text-xs font-medium text-white transition hover:bg-white/12 active:bg-white/18"
              >
                Logout All Others
              </button>
            </header>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Search sessions</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email"
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
              Showing {filtered.length} of {sessions.length} sessions
            </p>

            <ul className="mt-4 space-y-3">
              {filtered.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {s.name}
                        {s.isCurrentUser ? " (you)" : ""}
                      </p>
                      <p className="truncate text-xs text-zinc-400">{s.email}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em]">
                        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-zinc-200">
                          {s.role}
                        </span>
                        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-zinc-200">
                          {s.status}
                        </span>
                        <span className="rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-zinc-300">
                          {s.device}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => forceLogout(s.id)}
                        disabled={s.isCurrentUser || s.status === "expired" || isLoggingOut === s.id}
                        className="h-8 cursor-pointer rounded-md border border-white/25 px-3 text-xs font-medium text-white transition hover:bg-white/12 active:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoggingOut === s.id ? "Ending..." : s.status === "expired" ? "Ended" : "Force Logout"}
                      </button>
                      <p className="text-xs text-zinc-400">{s.lastSeen}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* OTP log */}
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="section-kicker mb-4">OTP Verification Log</p>
              <ul className="space-y-3">
                {OTP_LOG.map((o) => (
                  <li key={o.id} className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                    <div>
                      <p className="text-sm text-white">{o.email}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{o.time}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${otpStatusClasses[o.status]}`}>
                      {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {/* Config panel */}
          <article className="surface-card p-5 md:p-6">
            <header>
              <p className="section-kicker">Security Configuration</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white">Timeout Settings</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Configure idle timeout rules to prevent unauthorised access on shared campus computers.
              </p>
            </header>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                  Idle Timeout (minutes)
                </span>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={idleTimeout}
                  onChange={(e) => setIdleTimeout(e.target.value)}
                  className="h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                  Session Token Expiry (hours)
                </span>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={tokenExpiry}
                  onChange={(e) => setTokenExpiry(e.target.value)}
                  className="h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                  Max Concurrent Sessions per User
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(e.target.value)}
                  className="h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/45 focus:ring-2 focus:ring-white/20"
                />
              </label>

              <div className="border-t border-white/10 pt-4">
                <p className="section-kicker mb-3">Toggle Policies</p>
                <div className="space-y-2">
                  {[
                    { key: "sharedWarning", label: "Shared Computer Warning", sub: "Prompt users to log out on public devices", value: sharedWarning, toggle: () => setSharedWarning((v) => !v) },
                    { key: "autoLogout", label: "Auto-Logout on Idle", sub: "Terminate sessions after timeout period", value: autoLogout, toggle: () => setAutoLogout((v) => !v) },
                    { key: "rememberDevice", label: "Remember Device (30 days)", sub: "Skip OTP for trusted personal devices", value: rememberDevice, toggle: () => setRememberDevice((v) => !v) },
                  ].map((item) => (
                    <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">{item.sub}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={item.value}
                        onChange={item.toggle}
                        className="sr-only"
                      />
                      <div
                        className={`relative h-5 w-9 rounded-full border transition-colors ${
                          item.value ? "border-white/30 bg-white/20" : "border-white/15 bg-white/6"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            item.value ? "translate-x-4" : "translate-x-0.5"
                          }`}
                          style={{ opacity: item.value ? 1 : 0.4 }}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <PrimaryButton className="w-full" onClick={saveConfig} disabled={isSaving}>
                {saveSuccess ? "✓ Configuration Saved" : isSaving ? "Saving..." : "Save Configuration"}
              </PrimaryButton>

              <button
                type="button"
                onClick={forceLogoutAll}
                className="w-full cursor-pointer rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/12 active:bg-white/18"
              >
                Force Logout All Active Sessions
              </button>
            </div>
          </article>
        </section>
      </div>
    </MainLayout>
  );
}