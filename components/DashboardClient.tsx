"use client";

import { RedirectToSignIn, useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import AdminDashboard from "./AdminDashboard";
import FacultyDashboard from "./FacultyDashboard";
import StudentDashboard from "./StudentDashboard";

type RoleView = "student" | "faculty" | "admin";

function toRoleView(role: unknown): RoleView {
    if (role === "student" || role === "faculty" || role === "admin") {
        return role;
    }

    return "student";
}

function getWorkspaceOverride(value: string | null): RoleView | null {
    if (value === "student" || value === "faculty" || value === "admin") {
        return value;
    }

    return null;
}

export default function DashboardClient() {
    const { isLoaded, isSignedIn } = useAuth();
    const searchParams = useSearchParams();
    const currentUser = useQuery(api.users.getCurrentUser, isLoaded && isSignedIn ? {} : "skip");

    if (!isLoaded) {
        return (
            <main className="flex min-h-screen items-center justify-center p-6">
                <p className="text-sm text-zinc-300">Loading authentication...</p>
            </main>
        );
    }

    if (!isSignedIn) {
        return <RedirectToSignIn />;
    }

    if (currentUser === undefined || !currentUser.isSynced) {
        return (
            <main className="flex min-h-screen items-center justify-center p-6">
                <p className="text-sm text-zinc-300">Loading dashboard...</p>
            </main>
        );
    }

    const role = toRoleView(currentUser.role);
    const workspaceOverride = getWorkspaceOverride(searchParams.get("workspace"));
    const activeWorkspace = role === "admin" ? (workspaceOverride ?? "admin") : role;
    const viewerName = currentUser.fullName ?? currentUser.email ?? "MUniverse User";

    return activeWorkspace === "student" ? (
        <StudentDashboard viewerName={viewerName} />
    ) : activeWorkspace === "faculty" ? (
        <FacultyDashboard viewerName={viewerName} />
    ) : (
        <AdminDashboard viewerName={viewerName} />
    );
}
