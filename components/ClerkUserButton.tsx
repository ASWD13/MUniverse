"use client";

import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";

function DotIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z" />
    </svg>
  );
}

export default function ClerkUserButton() {
  return (
    <UserButton
      appearance={{
        theme: dark,
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Action label="signOut" />
        <UserButton.Action
          label="Open help"
          labelIcon={<DotIcon />}
          onClick={() => window.alert("Open help clicked")}
        />
        <UserButton.Link
          label="Profile settings"
          labelIcon={<DotIcon />}
          href="/dashboard/profile"
        />
        <UserButton.Action label="manageAccount" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
