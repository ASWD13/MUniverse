"use client";

import {
    RedirectToSignIn,
    useAuth,
} from "@clerk/nextjs";
import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import FacultyDashboard from "./FacultyDashboard";
import StudentDashboard from "./StudentDashboard";
import SyncUser from "./SyncUser";

type RoleView = "student" | "faculty" | "admin";

export default function DashboardClient() {
    const [role, setRole] = useState<RoleView>("student");
    const { isLoaded, isSignedIn } = useAuth();

    const roleButtonClass = (currentRole: RoleView) =>
        `rounded-lg px-3 py-2 text-xs font-semibold transition-all ${role === currentRole
            ? "bg-rose-600 text-white"
            : "bg-slate-800 text-slate-200 hover:bg-slate-700"
        }`;

    if (!isLoaded) {
        return (
            <main className="flex min-h-screen items-center justify-center p-6">
                <p className="text-sm text-slate-300">Loading dashboard...</p>
            </main>
        );
    }

    if (!isSignedIn) {
        return <RedirectToSignIn />;
    }

    return (
        <>
                <SyncUser />
                <div className="fixed right-4 top-4 z-60 flex items-center gap-2 rounded-xl bg-slate-900/90 p-2 shadow ring-1 ring-slate-700 backdrop-blur">
                    <button
                        className={roleButtonClass("student")}
                        onClick={() => setRole("student")}
                    >
                        Student
                    </button>
                    <button
                        className={roleButtonClass("faculty")}
                        onClick={() => setRole("faculty")}
                    >
                        Faculty
                    </button>
                    <button className={roleButtonClass("admin")} onClick={() => setRole("admin")}>
                        Admin
                    </button>
                </div>

                {role === "student" ? (
                    <StudentDashboard />
                ) : role === "faculty" ? (
                    <FacultyDashboard />
                ) : (
                    <AdminDashboard />
                )}
        </>
    );
}
