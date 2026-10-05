import type { Metadata } from "next";

import { Toaster } from "@/admin/components/ui/toaster";

import "@/admin/styles/admin.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Ishita Traders Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
