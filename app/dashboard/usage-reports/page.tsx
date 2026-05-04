import UsageReports from "@/components/UsageReports";
import { requireDashboardRole } from "../requireRole";

export default async function UsageReportsPage() {
  await requireDashboardRole(["admin"]);
  return <UsageReports />;
}
