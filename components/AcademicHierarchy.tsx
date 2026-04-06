"use client";

import { useState } from "react";
import { PrimaryButton, FormInput } from "./UIElements";

export default function AcademicHierarchy() {
  const [view, setView] = useState<"schools" | "programs" | "batches">("schools");

  return (
    <article className="surface-card p-5 md:p-6">
      <header>
        <p className="section-kicker">University Structure</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-white">Manage Hierarchy</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Define Schools, Degree Programs, and Student Batches.
        </p>
      </header>

      <div className="mt-6 flex gap-2 border-b border-white/10 pb-4">
        {["schools", "programs", "batches"].map((type) => (
          <button
            key={type}
            onClick={() => setView(type as any)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition ${
              view === type ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label={`New ${view.slice(0, -1)} Name`} placeholder="Enter name..." />
          <div className="flex items-end pb-1">
            <PrimaryButton className="w-full">Add {view.slice(0, -1)}</PrimaryButton>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          <li className="flex items-center justify-between rounded-lg bg-white/5 p-3 border border-white/10">
            <span className="text-sm text-white">Example {view.slice(0, -1).toUpperCase()} Item</span>
            <button className="text-xs text-zinc-500 hover:text-white">Remove</button>
          </li>
        </ul>
      </div>
    </article>
  );
}