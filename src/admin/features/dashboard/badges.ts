import "server-only";

import { and, count, eq } from "drizzle-orm";
import { cache } from "react";

import type { NavBadge } from "@/admin/config/navigation";
import { getDb } from "@/admin/server/db/client";
import { enquiries, messages, testimonials } from "@/admin/server/db/schema";

/** Counters on the sidebar: unread enquiries and messages, sample reviews still published. */
export const getNavBadges = cache(async (): Promise<Partial<Record<NavBadge, number>>> => {
  try {
    const db = await getDb();
    const [[unreadEnquiries], [unreadMessages], [samples]] = await Promise.all([
      db.select({ total: count() }).from(enquiries).where(eq(enquiries.isRead, false)),
      db.select({ total: count() }).from(messages).where(eq(messages.isRead, false)),
      db
        .select({ total: count() })
        .from(testimonials)
        .where(and(eq(testimonials.isSample, true), eq(testimonials.isPublished, true))),
    ]);
    return { enquiries: unreadEnquiries.total, inbox: unreadMessages.total, samples: samples.total };
  } catch {
    return {};
  }
});
