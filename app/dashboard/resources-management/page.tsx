import Resourcemanagement from "@/components/Resourcemanagement";
import { requireDashboardRole } from "../requireRole";

export default async function ResourceManagementPage() {
  await requireDashboardRole(["admin", "faculty"]);
  return <Resourcemanagement />;
}
