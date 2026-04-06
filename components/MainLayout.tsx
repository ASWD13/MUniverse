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

type WorkspaceRole = "student" | "faculty" | "admin";

function toWorkspaceRole(value: string | undefined): WorkspaceRole | null {
  if (value === "student" || value === "faculty" || value === "admin") {
    return value;
  }
  return null;
}

function formatRole(role: string | null | undefined) {
  if (!role) return "User";
  return `${role[0]?.toUpperCase() ?? ""}${role.slice(1)}`;
}

const baseNavItems = [
  { label: "Dashboard", href: "/dashboard", tab: "dashboard" },
  { label: "Profile", href: "/dashboard/profile", tab: null },
];

const adminManagementItems = [
  { label: "Academic Structure", tab: "structure" },
  { label: "Course Catalog", tab: "courses" },
  { label: "Resource Audit", tab: "resources" },
  { label: "Enrollment Records", tab: "enrollment" },
];

export default function MainLayout({ children, roleLabel }: MainLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useQuery(api.users.getCurrentUser);
  const activeTab = searchParams.get("tab") || (pathname === "/dashboard" ? "dashboard" : null);

  const isAdmin = currentUser?.role === "admin";
  const resolvedRoleLabel = roleLabel ?? formatRole(currentUser?.role);
  const userName = currentUser?.fullName ?? "MUniverse User";
  const userIdentifier = currentUser?.email ?? "Authenticated user";

  // --- LOGIC: Determine Active Workspace Context ---
  const selectedWorkspace =
    toWorkspaceRole(roleLabel?.toLowerCase()) ??
    toWorkspaceRole(searchParams.get("workspace") ?? undefined) ??
    (currentUser?.role as WorkspaceRole) ?? 
    "student";

  const canSwitchWorkspace = isAdmin && pathname === "/dashboard";

  const handleWorkspaceChange = (nextWorkspace: WorkspaceRole) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Safety: Clear admin tabs when switching to Student/Faculty views
    params.delete("tab"); 
    
    if (nextWorkspace === "admin") {
      params.delete("workspace");
    } else {
      params.set("workspace", nextWorkspace);
    }
    router.replace(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="h-dvh overflow-hidden bg-black text-zinc-100">
      <SyncUser />
      <div className="flex h-full w-full">
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/15 bg-black p-6 transition-transform duration-200 md:translate-x-0 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <header>
            <Link href="/" className="font-display text-2xl font-semibold text-white">MUniverse</Link>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Mahindra University</p>
          </header>

          <nav className="mt-8 flex flex-col gap-y-6">
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Main</p>
              {baseNavItems.map((item) => (
                <Link 
                  key={item.label} 
                  href={item.href} 
                  onClick={() => setIsMenuOpen(false)} 
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${(!activeTab && pathname === item.href) || (activeTab === item.tab) ? "bg-white/18 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* --- FIX: Only show Management if the ACTIVE WORKSPACE is Admin --- */}
            {selectedWorkspace === "admin" && (
              <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Management</p>
                {adminManagementItems.map((item) => (
                  <Link 
                    key={item.tab} 
                    href={`/dashboard?tab=${item.tab}`} 
                    onClick={() => setIsMenuOpen(false)} 
                    className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${activeTab === item.tab ? "bg-white/18 text-white" : "text-zinc-400 hover:text-white"}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        </aside>

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-black md:pl-72">
          <header className="z-30 flex h-16 items-center justify-between border-b border-white/15 bg-black/95 px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase text-zinc-200 md:hidden">Menu</button>
              
              <div className="flex items-center gap-4">
                <p className="hidden text-xs font-medium uppercase tracking-[0.08em] text-zinc-400 lg:block">Workspace</p>
                {canSwitchWorkspace ? (
                  <select
                    value={selectedWorkspace}
                    onChange={(event) => handleWorkspaceChange(event.target.value as WorkspaceRole)}
                    className="h-9 cursor-pointer rounded-md border border-white/20 bg-white/10 px-2.5 text-sm font-semibold text-white outline-none hover:bg-white/16 transition-all"
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
                <p className="text-[10px] uppercase text-zinc-500 font-bold">{userIdentifier}</p>
              </div>
              <ClerkUserButton />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-black p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}