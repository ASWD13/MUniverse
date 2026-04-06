"use client";

import { FormInput, PrimaryButton } from "./UIElements";

export default function CourseManager() {
  return (
    <article className="surface-card p-5 md:p-6">
      <header>
        <p className="section-kicker">Academic Records</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-white">Course Catalog</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Maintain the master list of all university courses and credit values.
        </p>
      </header>

      <form className="mt-6 grid gap-4 md:grid-cols-3">
        <FormInput label="Course Code" placeholder="e.g. CS101" />
        <FormInput label="Course Title" placeholder="e.g. Software Engineering" />
        <FormInput label="Credits" placeholder="e.g. 4" />
        <PrimaryButton className="md:col-span-3">Register New Course</PrimaryButton>
      </form>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-zinc-400 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="pb-3">Code</th>
              <th className="pb-3">Title</th>
              <th className="pb-3 text-right">Credits</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr className="border-b border-white/5">
              <td className="py-3 font-mono text-white">CS101</td>
              <td className="py-3">Introduction to Computer Science</td>
              <td className="py-3 text-right">4</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}