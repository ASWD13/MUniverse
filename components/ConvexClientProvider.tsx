"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useMemo, type ReactNode } from "react";

type ConvexClientProviderProps = {
  children: ReactNode;
};

export default function ConvexClientProvider({
  children,
}: ConvexClientProviderProps) {
  const convexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud";

  const convex = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
