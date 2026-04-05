"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import MainLayout from "./MainLayout";
import { useState } from "react";

function formatRole(role: string | null | undefined) {
  if (!role) {
    return "User";
  }

  return `${role[0]?.toUpperCase() ?? ""}${role.slice(1)}`;
}

export default function ProfilePage() {
  const user = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const [isUpdating, setIsUpdating] = useState(false);

  if (user === undefined || !user.isSynced) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-zinc-300">Loading profile...</p>
      </main>
    );
  }

  const displayName = user.fullName ?? "MUniverse User";
  const roleLabel = formatRole(user.role);
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "MU";

  const identityText = user.enrollmentNumber
    ? `Enrollment: ${user.enrollmentNumber}`
    : user.employeeId
      ? `Employee ID: ${user.employeeId}`
      : `Clerk ID: ${user.subject}`;

  const handleToggleEmail = async () => {
    setIsUpdating(true);
    try {
      await updatePreferences({
        emailNotifications: !user.preferences?.emailNotifications,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <MainLayout roleLabel={roleLabel}>
      <div className="w-full space-y-6">
        <header className="surface-card motion-enter flex flex-wrap items-center gap-4 p-6 md:p-7">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/12 text-xl font-semibold text-white">
            {initials}
          </div>
          <div>
            <p className="section-kicker">Profile</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-white">{displayName}</h1>
            <p className="mt-1 text-sm text-zinc-300">{identityText}</p>
          </div>
        </header>

        <section className="surface-card p-6 md:p-7">
          <h2 className="font-display text-2xl font-semibold text-white">Account details</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Email address</p>
              <p className="mt-2 text-sm text-zinc-100">{user.email ?? "Not available"}</p>
            </article>

            <article className="rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Primary role</p>
              <p className="mt-2 text-sm text-zinc-100">{roleLabel}</p>
            </article>

            <article className="rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Department</p>
              <p className="mt-2 text-sm text-zinc-100">{user.department ?? "Not available"}</p>
            </article>

            <article className="rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Account subject</p>
              <p className="mt-2 break-all text-sm text-zinc-100">{user.subject}</p>
            </article>
          </div>
          <p className="mt-5 text-sm text-zinc-400">Profile details are synced from Convex user records.</p>
        </section>

        <section className="surface-card p-6 md:p-7">
          <header>
            <p className="section-kicker">Preferences</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">Notification preferences</h2>
          </header>

          <div className="mt-5 space-y-4">
            <article className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 p-4">
              <div>
                <p className="font-semibold text-zinc-100">Email alerts</p>
                <p className="mt-1 text-sm text-zinc-400">Receive an email when a new announcement is posted.</p>
              </div>
              <button
                type="button"
                onClick={handleToggleEmail}
                disabled={isUpdating}
                className={`h-9 min-w-[5rem] cursor-pointer rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${user.preferences?.emailNotifications !== false
                  ? "border-white/40 bg-white/20 text-white hover:bg-white/25"
                  : "border-white/15 bg-white/5 text-zinc-400 hover:bg-white/10"
                  }`}
              >
                {isUpdating ? "..." : user.preferences?.emailNotifications !== false ? "Enabled" : "Disabled"}
              </button>
            </article>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
