import { desc } from "drizzle-orm";

import { enquiryStatusLabels } from "@/admin/content/types";
import { formInfo } from "@/admin/features/enquiries/presentation";
import { enquiryWhere } from "@/admin/features/enquiries/queries";
import { csvResponse, datedFileName, toCsv } from "@/admin/lib/csv";
import { formatDateTime } from "@/admin/lib/format";
import { AuthError, assertPermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { enquiries } from "@/admin/server/db/schema";
import { logActivity } from "@/admin/server/audit";

/** Enquiries as a spreadsheet, honouring the list's filters (form, status, search, dates, unread). */
export async function GET(request: Request) {
  let user;
  try {
    user = await assertPermission("enquiries:read");
  } catch (error) {
    if (error instanceof AuthError) return new Response(error.message, { status: 401 });
    throw error;
  }
  const params = new URL(request.url).searchParams;
  const filters = {
    form: params.get("form") ?? "",
    status: params.get("status") ?? "",
    q: params.get("q") ?? "",
    unread: params.get("unread") === "1",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  };
  const db = await getDb();
  const rows = await db
    .select()
    .from(enquiries)
    .where(enquiryWhere(filters))
    .orderBy(desc(enquiries.createdAt))
    .limit(20_000);

  // One column per distinct field label, in first-seen order, so every form's answers line up.
  const labels: string[] = [];
  for (const row of rows) for (const field of row.fields) if (!labels.includes(field.label)) labels.push(field.label);

  const csv = toCsv(
    [
      "Received (IST)",
      "Form",
      "Status",
      "Name",
      "Phone",
      "Email",
      "Company",
      "Product",
      ...labels,
      "Page",
      "Referrer",
      "UTM source",
      "UTM campaign",
      "Admin link",
    ],
    rows.map((row) => {
      const values = new Map(row.fields.map((field) => [field.label, field.value]));
      return [
        formatDateTime(row.createdAt),
        formInfo(row.formKey, row.formName).name,
        enquiryStatusLabels[row.status],
        row.name,
        row.phone,
        row.email,
        row.company,
        row.productName,
        ...labels.map((label) => values.get(label) ?? ""),
        row.pageUrl,
        row.referrer,
        row.utm.source ?? "",
        row.utm.campaign ?? "",
        new URL(`/admin/enquiries/${row.id}`, request.url).toString(),
      ];
    }),
  );
  await logActivity(user, {
    action: "enquiry.export",
    entityType: "enquiry",
    summary: `Exported ${rows.length} enquiries to CSV`,
  });
  return csvResponse(datedFileName("ishita-enquiries"), csv);
}
