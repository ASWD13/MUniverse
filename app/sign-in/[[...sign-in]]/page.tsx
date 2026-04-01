import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen w-full items-center bg-black px-4 py-10 md:px-10">
      <section className="grid w-full gap-6 md:grid-cols-2">
        <article className="surface-card p-6 md:p-10">
          <p className="section-kicker">MUniverse Access</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-5xl">
            Sign in to your campus workspace
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-300">
            Continue with your Mahindra University account to view announcements and role-specific
            tools.
          </p>
        </article>

        <article className="surface-card flex items-center justify-center p-4 md:p-8">
          <SignIn />
        </article>
      </section>
    </main>
  );
}
