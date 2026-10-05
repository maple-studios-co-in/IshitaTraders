import { exportInbox } from "@/admin/features/inbox/export";

/** CSV download of the inbox (`kind=messages`) or contact clicks (`kind=clicks`), with the list filters. */
export async function GET(request: Request) {
  return exportInbox(request);
}
