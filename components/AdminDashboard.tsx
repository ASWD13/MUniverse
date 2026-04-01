"use client";

import { useState } from "react";
import MainLayout from "./MainLayout";
import { DashboardCard, FormInput, PrimaryButton } from "./UIElements";

export default function AdminDashboard() {
  const [noticeTitle, setNoticeTitle] = useState("");

  const handleBroadcast = () => {
    if (!noticeTitle.trim()) {
      return;
    }

    globalThis.alert(`Broadcasting notice: ${noticeTitle}`);
    setNoticeTitle("");
  };

  return (
    <MainLayout roleLabel="Admin">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
          <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
            System Live
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <DashboardCard title="Post University Notice" tone="rose">
              <div className="space-y-4">
                <div className="mb-2 rounded-xl bg-blue-50 p-3 text-blue-700">
                  <span className="text-[10px] font-bold uppercase">Public Broadcast</span>
                </div>
                <FormInput
                  label="Notice Title"
                  placeholder="e.g., Holiday Announcement"
                  value={noticeTitle}
                  onChange={(event) => setNoticeTitle(event.target.value)}
                />
                <div className="flex flex-col space-y-1">
                  <label className="text-left text-xs font-bold uppercase text-slate-500">
                    Message Content
                  </label>
                  <textarea
                    className="h-32 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Describe the notice here..."
                  />
                </div>
                <PrimaryButton className="w-full" onClick={handleBroadcast}>
                  Send
                </PrimaryButton>
              </div>
            </DashboardCard>
          </div>

          <div className="lg:col-span-2">
            <DashboardCard title="User Management" tone="slate">
              <div className="mb-6 w-fit rounded-lg bg-slate-50 p-2">
                <span className="text-xs font-bold uppercase text-slate-500">Active Directory</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                      <th className="pb-4 font-bold">User / ID</th>
                      <th className="pb-4 font-bold">Role</th>
                      <th className="pb-4 font-bold">Status</th>
                      <th className="pb-4 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {[
                      {
                        name: "Pranav Suhas",
                        id: "MU-102",
                        role: "Student",
                        badge: "bg-emerald-100 text-emerald-700",
                      },
                      {
                        name: "Sai Pavan",
                        id: "MU-103",
                        role: "Faculty",
                        badge: "bg-blue-100 text-blue-700",
                      },
                      {
                        name: "Admin User",
                        id: "MU-001",
                        role: "SuperAdmin",
                        badge: "bg-rose-100 text-rose-700",
                      },
                    ].map((user) => (
                      <tr key={user.id} className="group transition-colors hover:bg-slate-50">
                        <td className="py-4">
                          <p className="font-bold text-slate-900">{user.name}</p>
                          <p className="text-[10px] text-slate-400">ID: {user.id}</p>
                        </td>
                        <td className="py-4">
                          <span
                            className={`${user.badge} rounded px-2 py-1 text-[10px] font-black uppercase`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 text-xs font-medium italic text-blue-600">Active</td>
                        <td className="py-4 text-right">
                          <button className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-400 transition-colors group-hover:text-rose-600">
                            Modify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
