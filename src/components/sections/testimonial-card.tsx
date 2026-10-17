import Image from "next/image";

import { resolveImage } from "@/admin/content/images";
import type { PublicTestimonial as Testimonial } from "@/admin/content/public-types";
import type { TestimonialBadge } from "@/admin/content/types";
import { CheckCircleIcon, MedicalIcon, QuoteIcon, StarIcon, StorefrontIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const badgeStyles: Record<
  TestimonialBadge,
  { Icon?: typeof CheckCircleIcon; className: string; iconClassName?: string }
> = {
  installation: {
    Icon: CheckCircleIcon,
    className: "bg-[rgb(52_177_226/0.55)] text-black",
    iconClassName: "h-[14.7px] w-[17.4px]",
  },
  commercial: {
    Icon: StorefrontIcon,
    className: "bg-[rgb(52_177_226/0.55)] text-black",
    iconClassName: "h-[14.7px] w-[13.4px]",
  },
  healthcare: {
    Icon: MedicalIcon,
    className: "bg-[rgb(116_143_15/0.45)] text-[#002115]",
    iconClassName: "h-[13.4px] w-[16px]",
  },
  sample: { className: "bg-slate-200 text-slate-600" },
};

/** One review card (Figma "Card 1/2"): badge, stars, quote and the customer strip. `active` is the highlighted look. */
export function TestimonialCard({
  item,
  active,
  className,
}: {
  item: Testimonial;
  active: boolean;
  className?: string;
}) {
  const badge = badgeStyles[item.badge.kind] ?? badgeStyles.sample;
  const avatar = resolveImage(item.avatar, item.name);

  return (
    <figure
      className={cn(
        "flex min-h-[396px] w-full flex-col justify-between overflow-hidden rounded-[8px] p-6 pb-0 transition-[background-color,box-shadow,translate] duration-500 ease-out-expo select-none",
        active
          ? "-translate-y-2 bg-surface shadow-[0_5px_13px_rgb(0_0_0/0.05),0_4px_6px_-1px_rgb(0_0_0/0.1)]"
          : "bg-white shadow-card",
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between pb-4">
          <span
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-xl px-2 text-[12px] leading-[14px] font-bold tracking-[0.04em] md:text-[11px]",
              badge.className,
            )}
          >
            {badge.Icon ? <badge.Icon className={badge.iconClassName} /> : null}
            {item.badge.label}
          </span>
          <QuoteIcon className="size-[47px] text-surface-tint" />
        </div>
        <div className="flex items-center gap-1.5 pb-2" aria-label={`Rated ${item.rating} out of 5`}>
          <span className="flex" aria-hidden="true">
            {Array.from({ length: 5 }, (_, star) => (
              <StarIcon
                key={star}
                className={cn("h-[22px] w-[23px]", star < item.rating ? "text-[#ffc107]" : "text-slate-300")}
              />
            ))}
          </span>
          <span className="text-[13.5px] font-semibold tracking-[0.04em] text-body">{item.rating.toFixed(1)}</span>
        </div>
        <blockquote className={cn("text-[14px] leading-[22.8px]", active ? "text-ink" : "text-body")}>
          <p>“{item.quote}”</p>
        </blockquote>
      </div>

      <figcaption
        className={cn(
          "-mx-6 mt-6 flex items-center gap-2 p-4 transition-colors duration-500",
          active ? "bg-surface-tint" : "bg-[#f0f3ff]",
        )}
      >
        {avatar ? (
          <Image
            src={avatar.src}
            alt=""
            width={44}
            height={44}
            // Tiny and shared by every loop copy — load up front so slides never pop in mid-transition.
            loading="eager"
            className="size-11 shrink-0 rounded-xl object-cover shadow-soft"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white font-display text-sm font-bold text-navy-900 shadow-soft"
          >
            {initials(item.name)}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-lg leading-6 font-bold text-navy-900">{item.name}</span>
          <span className="text-xs leading-[18px] text-body">{item.location}</span>
        </span>
      </figcaption>
    </figure>
  );
}
