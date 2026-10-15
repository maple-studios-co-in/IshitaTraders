import { anchor, productLinks, sectionIds } from "@/config/navigation";
import { productLineup, type LineupView } from "@/content/homepage";

import { LineupCard, type LineupCardView } from "./lineup-card";
import { Label, Statement } from "./ui";

/**
 * "Product lineup": four cards, each with two views. "Explore options" opens the catalogue on the
 * card's categories — or, while none of them has a published product, asks about it in the
 * enquiry form below.
 */
export function ProductLineup({ liveCategories }: { liveCategories: ReadonlySet<string> }) {
  const destination = (categories: string[], interest: string) => {
    const live = categories.filter((slug) => liveCategories.has(slug));
    return live.length > 0 ? { href: productLinks.categories(live) } : { href: anchor(sectionIds.contact), interest };
  };

  return (
    <section
      id={sectionIds.products}
      aria-labelledby="products-title"
      className="anchor-band bg-ish-deep text-white focus-on-dark"
    >
      <div className="band flex flex-col gap-[25px]">
        <Label id="products-title" tone="dark">
          {productLineup.label}
        </Label>
        <Statement lines={productLineup.statement} tone="dark" />
        <div className="grid gap-x-4 gap-y-[25px] md:grid-cols-2">
          {productLineup.products.map((product) => {
            const views = product.views.map((view: LineupView): LineupCardView => ({
              label: view.label,
              image: { src: view.image.src, alt: view.image.alt },
              kind: view.kind,
              title: view.title ?? product.title,
              ...destination(view.categories ?? product.categories, view.interest ?? product.interest),
            })) as [LineupCardView, LineupCardView];
            return (
              <LineupCard
                key={product.id}
                id={product.id}
                caption={product.caption}
                note={product.note}
                cta={productLineup.cta}
                views={views}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
