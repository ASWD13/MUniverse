"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";

export default function SyncUser() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasSynced = useRef(false);
  const upsertUser = useMutation(api.users.upsertUser);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasSynced.current) {
      return;
    }

    hasSynced.current = true;

    void upsertUser().catch(() => {
      hasSynced.current = false;
    });
  }, [isLoaded, isSignedIn, upsertUser]);

  return null;
}
