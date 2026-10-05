import { cn } from "@/lib/cn";

/** How a page is likely to look in Google results (titles cut at ~60 characters, snippets at ~160). */
export function SearchPreview({
  title,
  description,
  url,
  className,
}: {
  title: string;
  description: string;
  url: string;
  className?: string;
}) {
  const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);
  let display = url;
  try {
    const parsed = new URL(url);
    display =
      [parsed.host, ...parsed.pathname.split("/").filter(Boolean)].join(" › ") +
      (parsed.search ? ` › ${parsed.search.slice(1)}` : "");
  } catch {
    // Keep the raw value.
  }
  return (
    <div
      className={cn("rounded-xl border border-slate-200 bg-white p-4", className)}
      aria-label="Google search preview"
    >
      <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">Google preview</p>
      <p className="truncate text-xs text-[#202124]">{display}</p>
      <p className="mt-0.5 truncate text-lg leading-snug text-[#1a0dab]">{clip(title || "Untitled", 60)}</p>
      <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[#4d5156]">
        {description ? (
          clip(description, 160)
        ) : (
          <span className="italic">No description — Google will pick text from the page.</span>
        )}
      </p>
    </div>
  );
}
