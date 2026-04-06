"use client";

export default function ResourceAuditor() {
  return (
    <article className="surface-card p-5 md:p-6">
      <header className="flex justify-between items-start">
        <div>
          <p className="section-kicker">Content Governance</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-white">Library Audit</h2>
        </div>
        <input 
          className="bg-white/5 border border-white/20 rounded-md px-3 py-1 text-xs text-white"
          placeholder="Search resources..."
        />
      </header>

      <div className="mt-6 space-y-3">
        {/* Resource Item */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
          <div>
            <p className="text-sm font-medium text-white">SE_Lecture_Notes.pdf</p>
            <p className="text-[11px] text-zinc-500">Uploaded by Prof. Krishna • CS202</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border border-white/20 text-[10px] text-white hover:bg-white/10">View</button>
            <button className="px-3 py-1 rounded border border-red-500/50 text-[10px] text-red-400 hover:bg-red-500/10">Flag</button>
          </div>
        </div>
      </div>
    </article>
  );
}