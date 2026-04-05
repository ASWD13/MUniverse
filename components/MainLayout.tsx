"use client";

import ClerkUserButton from "@/components/ClerkUserButton";
import SyncUser from "@/components/SyncUser";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

type MainLayoutProps = {
  children: ReactNode;
  roleLabel?: string;
};

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Profile", href: "/dashboard/profile" },
];

type WorkspaceRole = "student" | "faculty" | "admin";

function toWorkspaceRole(value: string | undefined): WorkspaceRole | null {
  if (value === "student" || value === "faculty" || value === "admin") {
    return value;
  }

  return null;
}

function formatRole(role: string | null | undefined) {
  if (!role) {
    return "User";
  }

  return `${role[0]?.toUpperCase() ?? ""}${role.slice(1)}`;
}

function initialsFromName(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "MU";
}

export default function MainLayout({ children, roleLabel }: MainLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useQuery(api.users.getCurrentUser);

  const resolvedRoleLabel = roleLabel ?? formatRole(currentUser?.role);
  const userName = currentUser?.fullName ?? "MUniverse User";
  const userInitials = initialsFromName(userName);
  const userIdentifier = currentUser?.email ?? currentUser?.subject ?? "Authenticated user";
  const isAdmin = currentUser?.role === "admin";
  const canSwitchWorkspace = isAdmin && pathname === "/dashboard";
  const selectedWorkspace =
    toWorkspaceRole(roleLabel?.toLowerCase()) ??
    toWorkspaceRole(searchParams.get("workspace") ?? undefined) ??
    "admin";

  const handleWorkspaceChange = (nextWorkspace: WorkspaceRole) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextWorkspace === "admin") {
      params.delete("workspace");
    } else {
      params.set("workspace", nextWorkspace);
    }

    const queryString = params.toString();
    router.replace(queryString ? `/dashboard?${queryString}` : "/dashboard");
  };

  return (
    <div className="h-dvh overflow-hidden bg-black text-zinc-100">
      <SyncUser />

      <div className="flex h-full w-full">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/15 bg-black p-6 transition-transform duration-200 md:translate-x-0 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <header className="motion-enter">
            <Link href="/" className="font-display text-2xl font-semibold text-white">
              MUniverse
            </Link>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-zinc-400">
              Mahindra University Portal
            </p>
          </header>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive
                    ? "bg-white/18 text-white"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white active:bg-white/16"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-black md:pl-72">
          <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/15 bg-black/95 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200 hover:bg-white/10 active:bg-white/16 md:hidden"
              >
                Menu
              </button>
              <div className="grid grid-cols-1 items-center lg:grid-cols-2">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400 mr-4">
                  Workspace
                </p>
                {canSwitchWorkspace ? (
                  <label className="sr-only" htmlFor="workspace-switcher">
                    Workspace switcher
                  </label>
                ) : null}
                {canSwitchWorkspace ? (
                  <select
                    id="workspace-switcher"
                    value={selectedWorkspace}
                    onChange={(event) => handleWorkspaceChange(event.target.value as WorkspaceRole)}
                    className="mt-0.5 h-9 cursor-pointer rounded-md border border-white/20 bg-white/10 px-2.5 font-display text-sm font-semibold text-white outline-none transition hover:bg-white/16 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                  >
                    <option value="admin">Admin</option>
                    <option value="faculty">Faculty</option>
                    <option value="student">Student</option>
                  </select>
                ) : (
                  <p className="font-display text-lg font-semibold text-white">{resolvedRoleLabel}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="text-sm font-semibold text-white">{userName}</p>
                <p className="text-xs text-zinc-400">{userIdentifier}</p>
              </div>
              <ClerkUserButton />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-black px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>

      {isMenuOpen ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/70 md:hidden"
        />
      ) : null}
    </div>
  );
}
