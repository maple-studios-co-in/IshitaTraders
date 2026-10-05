import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/admin/server/db/client";
import { notes } from "@/admin/server/db/schema";

export type NoteRow = typeof notes.$inferSelect;

export async function listNotes(entityType: "enquiry" | "message", entityId: string): Promise<NoteRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.entityType, entityType), eq(notes.entityId, entityId)))
    .orderBy(asc(notes.createdAt));
}
