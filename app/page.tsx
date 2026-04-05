import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen w-full bg-black px-6 py-10 md:px-10 md:py-14">
      <section className="surface-card motion-enter p-7 md:p-10">
        <p className="section-kicker">MUniverse</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold tracking-tight text-white md:text-6xl">
          Communication infrastructure for Mahindra University.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300">
          One workspace for students, faculty, and administrators to send, receive, and track
          important announcements with clarity.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-lg border border-white/30 bg-white/18 px-5 text-sm font-medium text-white transition hover:bg-white/24 active:bg-white/30"
          >
            Open dashboard
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="font-display text-xl font-semibold text-white">Role-aware interface</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            Each user type gets the right controls and the right information.
          </p>
        </article>

        <article className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="font-display text-xl font-semibold text-white">Broadcast targeting</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            Send announcements to specific audiences instead of broadcasting noise.
          </p>
        </article>

        <article className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="font-display text-xl font-semibold text-white">Read-state visibility</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            Understand what has been acknowledged and what still needs attention.
          </p>
        </article>
      </section>
    </main>
  );
}
