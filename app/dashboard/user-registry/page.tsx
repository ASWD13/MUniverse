import Userregistry from "@/components/Userregistry";
import { requireDashboardRole } from "../requireRole";

export default async function UserRegistryPage() {
  await requireDashboardRole(["admin"]);
  return <Userregistry />;
}
