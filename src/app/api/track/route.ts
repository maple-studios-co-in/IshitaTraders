import { handleTrackBeacon } from "@/admin/features/inbox/handlers";

/** Contact-button click beacons from the website (Admin → Inbox → Contact clicks). */
export async function POST(request: Request) {
  return handleTrackBeacon(request);
}
