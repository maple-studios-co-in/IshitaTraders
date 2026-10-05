import type { Metadata } from "next";

import { DashboardView } from "@/admin/features/dashboard/dashboard-view";
import { requirePermission } from "@/admin/server/auth/guard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const user = await requirePermission("dashboard:view");
  const { denied } = await searchParams;
  return <DashboardView user={user} denied={typeof denied === "string" ? denied : undefined} />;
}
