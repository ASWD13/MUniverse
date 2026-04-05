"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black px-6">

      {/* Heading */}
      <div className="text-center mb-6 max-w-xl">

        <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-white">
          MUniverse Access
        </h1>

        <p className="mt-3 text-sm text-white/50 leading-relaxed">
          Continue with your Mahindra University email to access your dashboard.
        </p>
        <p className="text-sm text-red-200 leading-relaxed">
          Non Mahindra University email addresses will not work.
        </p>
      </div>

      {/* Clerk Card */}
      <div className="w-full max-w-md">
        <SignIn />
      </div>

    </main>
  );
}