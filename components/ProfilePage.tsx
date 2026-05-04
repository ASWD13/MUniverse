"use client";

import { useMutation, useQuery } from "convex/react";
import { useAuth, useUser } from "@clerk/nextjs";
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
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const user = useQuery(api.users.getCurrentUser, isLoaded && isSignedIn ? {} : "skip");
  const updatePreferences = useMutation(api.users.updatePreferences);
  const updateProfile = useMutation(api.users.updateProfile);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  if (user === undefined || !user?.isSynced) {
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

  const handleEditClick = () => {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setIsUpdating(true);
    try {
      // 1. Update our Convex backend
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      
      // 2. Also update Clerk directly, so JWTs, avatars, and reload states get the new name instantly!
      if (clerkUser) {
        await clerkUser.update({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
      }

      setIsEditingProfile(false);
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
          <header className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-white">Account details</h2>
            {!isEditingProfile ? (
              <button
                onClick={handleEditClick}
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/20 bg-white/8 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:bg-white/14"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                 <button
                  onClick={() => setIsEditingProfile(false)}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-white/20 bg-transparent px-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300 transition hover:bg-white/5"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-white/40 bg-white/20 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-white/25"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </header>

          {isEditingProfile ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">First Name</label>
                 <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Last Name</label>
                 <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none transition-colors"
                />
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-lg border border-white/15 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Email address</p>
                <p className="mt-2 text-sm text-zinc-100">{user.email ?? "Not available"}</p>
              </article >
  
              <article className="rounded-lg border border-white/15 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Primary role</p>
                <p className="mt-2 text-sm text-zinc-100">{roleLabel}</p>
              </article>
  
              <article className="rounded-lg border border-white/15 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Department</p>
                <p className="mt-2 text-sm text-zinc-100">{user.department ?? "Not available"}</p>
              </article >
  
              <article className="rounded-lg border border-white/15 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Account subject</p>
                <p className="mt-2 break-all text-sm text-zinc-100">{user.subject}</p>
              </article >
            </div >
          )}
          <p className="mt-5 text-sm text-zinc-400">Profile details are synced from Convex user records.</p>
        </section >

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
                className={`h-9 min-w-20 cursor-pointer rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${user.preferences?.emailNotifications !== false
                  ? "border-white/40 bg-white/20 text-white hover:bg-white/25"
                  : "border-white/15 bg-white/5 text-zinc-400 hover:bg-white/10"
                  }`}
              >
                {isUpdating ? "..." : user.preferences?.emailNotifications !== false ? "Enabled" : "Disabled"}
              </button>
            </article>
          </div>
        </section>
      </div >
    </MainLayout >
  );
}
