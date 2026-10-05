import {
  ClipboardList,
  Database,
  FileCode2,
  History,
  Images,
  Inbox,
  LayoutDashboard,
  MessageCircleQuestion,
  Package,
  PanelsTopLeft,
  ScanSearch,
  Signpost,
  Star,
  Tags,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "./permissions";

export type NavBadge = "enquiries" | "inbox" | "samples";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
  badge?: NavBadge;
  /** Only highlight on an exact path match (for the dashboard). */
  exact?: boolean;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const adminNav: AdminNavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard, permission: "dashboard:view", exact: true }],
  },
  {
    title: "Leads",
    items: [
      {
        label: "Enquiries",
        href: "/admin/enquiries",
        icon: ClipboardList,
        permission: "enquiries:read",
        badge: "enquiries",
      },
      { label: "Inbox", href: "/admin/inbox", icon: Inbox, permission: "inbox:read", badge: "inbox" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", icon: Package, permission: "products:read" },
      { label: "Brands & categories", href: "/admin/catalogue", icon: Tags, permission: "products:read" },
    ],
  },
  {
    title: "Website",
    items: [
      { label: "Site content", href: "/admin/content", icon: PanelsTopLeft, permission: "content:write" },
      { label: "Testimonials", href: "/admin/testimonials", icon: Star, permission: "content:write", badge: "samples" },
      { label: "FAQs", href: "/admin/faqs", icon: MessageCircleQuestion, permission: "content:write" },
      { label: "HTML pages", href: "/admin/pages", icon: FileCode2, permission: "pages:write" },
      { label: "Media library", href: "/admin/media", icon: Images, permission: "media:write" },
    ],
  },
  {
    title: "Growth",
    items: [
      { label: "SEO & audit", href: "/admin/seo", icon: ScanSearch, permission: "seo:write" },
      { label: "Redirects", href: "/admin/redirects", icon: Signpost, permission: "redirects:write" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Users & roles", href: "/admin/users", icon: Users, permission: "users:manage" },
      { label: "Activity log", href: "/admin/activity", icon: History, permission: "activity:read" },
      { label: "Integrations", href: "/admin/integrations", icon: Webhook, permission: "integrations:manage" },
      { label: "Backup & export", href: "/admin/backup", icon: Database, permission: "backup:export" },
    ],
  },
];
