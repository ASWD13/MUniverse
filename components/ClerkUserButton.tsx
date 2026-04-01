"use client";

import { UserButton } from "@clerk/nextjs";

export default function ClerkUserButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-9 w-9 ring-1 ring-white/30",
          userButtonPopoverCard: "border border-white/20 bg-zinc-950 text-zinc-100 shadow-lg",
          userButtonPopoverActionButton:
            "text-zinc-100 hover:bg-white/10 active:bg-white/18 cursor-pointer",
        },
      }}
    />
  );
}
