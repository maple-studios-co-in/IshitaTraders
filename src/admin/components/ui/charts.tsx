import { cn } from "@/lib/cn";

export interface SeriesPoint {
  /** yyyy-mm-dd */
  day: string;
  value: number;
}

const shortDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Daily columns with an optional second series drawn as a line (pure SVG, server-rendered, no
 * chart library). Every column has a title tooltip for exact numbers.
 */
export function DailyChart({
  bars,
  line,
  barLabel,
  lineLabel,
  height = 180,
  className,
}: {
  bars: SeriesPoint[];
  line?: SeriesPoint[];
  barLabel: string;
  lineLabel?: string;
  height?: number;
  className?: string;
}) {
  const width = 720;
  const padding = { top: 12, right: 8, bottom: 26, left: 30 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...bars.map((point) => point.value), ...(line ?? []).map((point) => point.value));
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const step = innerWidth / Math.max(1, bars.length);
  const barWidth = Math.max(2, step * 0.62);
  const y = (value: number) => padding.top + innerHeight - (value / niceMax) * innerHeight;
  const ticks = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];
  const linePath = line
    ?.map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${(padding.left + step * index + step / 2).toFixed(1)},${y(point.value).toFixed(1)}`,
    )
    .join(" ");

  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${barLabel} per day${lineLabel ? ` and ${lineLabel}` : ""}`}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e2e8f0"
              strokeDasharray={tick === 0 ? undefined : "3 4"}
            />
            <text x={padding.left - 6} y={y(tick) + 3.5} textAnchor="end" fontSize="10" fill="#94a3b8">
              {Number.isInteger(tick) ? tick : ""}
            </text>
          </g>
        ))}
        {bars.map((point, index) => {
          const x = padding.left + step * index + (step - barWidth) / 2;
          const top = y(point.value);
          return (
            <g key={point.day}>
              <rect
                x={x}
                y={top}
                width={barWidth}
                height={Math.max(0, padding.top + innerHeight - top)}
                rx={Math.min(3, barWidth / 3)}
                fill="#00236f"
                opacity={point.value ? 0.9 : 0}
              >
                <title>{`${shortDay.format(new Date(`${point.day}T00:00:00Z`))}: ${point.value} ${barLabel.toLowerCase()}${line ? ` · ${line[index]?.value ?? 0} ${lineLabel?.toLowerCase()}` : ""}`}</title>
              </rect>
              {index % Math.ceil(bars.length / 6) === 0 || index === bars.length - 1 ? (
                <text
                  x={padding.left + step * index + step / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                >
                  {shortDay.format(new Date(`${point.day}T00:00:00Z`))}
                </text>
              ) : null}
            </g>
          );
        })}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="#5aa832"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-navy-800" aria-hidden="true" /> {barLabel}
        </span>
        {lineLabel ? (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-leaf-600" aria-hidden="true" /> {lineLabel}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/** Labelled horizontal bars (e.g. enquiries per form). */
export function BarList({
  items,
  emptyLabel = "No data yet.",
}: {
  items: { label: string; value: number; href?: string; hint?: string }[];
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (!items.length || items.every((item) => item.value === 0))
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            {item.href ? (
              <a href={item.href} className="truncate font-medium text-slate-700 hover:text-navy-900 hover:underline">
                {item.label}
              </a>
            ) : (
              <span className="truncate font-medium text-slate-700">{item.label}</span>
            )}
            <span className="shrink-0 font-semibold text-navy-950 tabular-nums">
              {item.value.toLocaleString("en-IN")}
              {item.hint ? <span className="ml-1 text-xs font-normal text-slate-500">{item.hint}</span> : null}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-navy-800 to-brand-500"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
