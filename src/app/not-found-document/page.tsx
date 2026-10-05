import { notFound } from "next/navigation";

/**
 * The branded 404 (`app/not-found.tsx` inside the root layout) as a standalone document, with a
 * real 404 status. The catch-all route (`app/[...slug]/route.ts`) fetches it to answer unknown
 * URLs, because `notFound()` inside a Route Handler only returns an empty 404. Not linked anywhere.
 */
export default function NotFoundDocument(): never {
  notFound();
}
