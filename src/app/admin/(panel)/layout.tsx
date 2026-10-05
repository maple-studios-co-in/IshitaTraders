import { AdminChrome } from "@/admin/components/layout/admin-chrome";
import { getNavBadges } from "@/admin/features/dashboard/badges";
import { requireUser } from "@/admin/server/auth/guard";

/** Every signed-in admin page: sidebar, top bar and live counters. */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  const badges = await getNavBadges();
  return (
    <AdminChrome user={{ name: user.name, email: user.email, role: user.role }} badges={badges}>
      {children}
    </AdminChrome>
  );
}
