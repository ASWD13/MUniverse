import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

import { api } from "@/convex/_generated/api";

type AppRole = "student" | "faculty" | "admin";

export async function requireDashboardRole(allowedRoles: AppRole[]) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await fetchQuery(api.users.getUserByClerkId, {
    clerkId: userId,
  });

  if (!user || !allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}
