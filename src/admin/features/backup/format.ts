/**
 * The backup file format, shared by the export route, the restore action and the restore UI
 * (client-safe: no server imports).
 *
 * `{ format, version, exportedAt, tables: { <table>: rows[] } }` — rows use the admin's field
 * names (camelCase) with dates as ISO strings. Never contains password hashes, sessions or file
 * bytes.
 */

export const BACKUP_FORMAT = "ishita-traders-backup";
export const BACKUP_VERSION = 1;
export const ACTIVITY_LOG_LIMIT = 5000;

/** Website content: what a restore writes back (upserted by id, in this order). */
export const contentTables = [
  "settings",
  "brands",
  "categories",
  "products",
  "testimonials",
  "faqs",
  "pages",
  "page_versions",
  "redirects",
] as const;

/** Records kept for reference and audits; never restored. */
export const recordTables = [
  "enquiries",
  "messages",
  "notes",
  "lead_events",
  "media",
  "activity_log",
  "users",
] as const;

export const backupTables = [...contentTables, ...recordTables] as const;

export type ContentTable = (typeof contentTables)[number];
export type BackupTable = (typeof backupTables)[number];

export const backupTableInfo: Record<BackupTable, { label: string; note?: string }> = {
  settings: { label: "Site settings", note: "Business details, contact, hero, SEO…" },
  brands: { label: "Brands" },
  categories: { label: "Categories" },
  products: { label: "Products" },
  testimonials: { label: "Testimonials" },
  faqs: { label: "FAQs" },
  pages: { label: "HTML pages" },
  page_versions: { label: "Page versions" },
  redirects: { label: "Redirects" },
  enquiries: { label: "Enquiries" },
  messages: { label: "Inbox messages" },
  notes: { label: "Internal notes" },
  lead_events: { label: "Contact-button clicks" },
  media: { label: "Media library", note: "File details only — not the files themselves" },
  activity_log: { label: "Activity log", note: `Latest ${ACTIVITY_LOG_LIMIT.toLocaleString("en-IN")} entries` },
  users: { label: "Users", note: "Name, email, role and status only — never passwords or sessions" },
};

/** Typed into the restore dialog to confirm. */
export const RESTORE_CONFIRM_WORD = "RESTORE";

/** The restore upload is gzipped in the browser; Server Actions accept bodies up to 4 MB. */
export const MAX_RESTORE_UPLOAD_BYTES = 3.8 * 1024 * 1024;

export interface RestoreTablePlan {
  table: ContentTable;
  label: string;
  /** Rows in the backup. */
  rows: number;
  /** Backup rows that overwrite a current row with the same id. */
  update: number;
  /** Backup rows that don't exist any more and are added back. */
  create: number;
  /** Current rows (different id) that hold a backup row's slug/address and are replaced by it. */
  replace: number;
  /** Current rows not in the backup, left as they are. */
  keep: number;
}

export interface RestorePlan {
  exportedAt: string;
  tables: RestoreTablePlan[];
  totalRows: number;
  warnings: string[];
}
