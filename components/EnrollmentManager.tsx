"use client";
import { FormInput, PrimaryButton } from "./UIElements";

export default function EnrollmentManager() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="surface-card p-6">
        <p className="section-kicker">Academic Records</p>
        <h2 className="text-2xl font-semibold text-white">Enrollment Management</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Track student course registration, grades, and attendance status.
        </p>
      </header>
      
      <div className="surface-card p-6 grid gap-4 md:grid-cols-2">
        <FormInput label="Student ID" placeholder="e.g., se23ucse015" />
        <FormInput label="Course Code" placeholder="e.g., CS101" />
        <div className="md:col-span-2">
            <PrimaryButton className="w-full">Register Enrollment</PrimaryButton>
        </div>
      </div>
      
      <div className="surface-card overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-3">Student</th>
              <th className="px-6 py-3">Course</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            <tr className="hover:bg-white/5 transition">
              <td className="px-6 py-4 text-white font-medium">Harshith Sai Bhaskar Alluri</td>
              <td className="px-6 py-4">Software Engineering</td>
              <td className="px-6 py-4">
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-green-400 border border-green-500/20">
                  Active
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}