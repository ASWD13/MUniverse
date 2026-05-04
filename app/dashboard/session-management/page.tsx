import Sessionmanagement from "@/components/Sessionmanagement";
import { requireDashboardRole } from "../requireRole";

export default async function SessionManagementPage() {
  await requireDashboardRole(["admin"]);
  return <Sessionmanagement />;
}
