import { SmartLink } from "@/components/ui/smart-link";
import { productLinks, sectionIds } from "@/config/navigation";
import { trustedBrands } from "@/content/homepage";

import { Lines } from "./ui";

const simplify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * "Trusted names. Local guidance.": the brand row from Admin → Site content → Hero. A name that
 * matches a catalogue brand ("UTL SOLAR" ↔ UTL Solar) opens that brand's products.
 */
export function TrustedBrands({
  names,
  catalogueBrands,
}: {
  names: string[];
  catalogueBrands: { slug: string; name: string }[];
}) {
  if (names.length === 0) return null;
  const brandFor = (name: string) => {
    const key = simplify(name);
    return catalogueBrands.find((brand) => {
      const candidate = simplify(brand.name);
      return candidate === key || key.startsWith(candidate) || candidate.startsWith(key);
    });
  };

  return (
    <section id={sectionIds.brands} aria-labelledby="brands-title" className="anchor-band bg-white">
      <div className="band flex flex-col gap-[25px]">
        <h2 id="brands-title" className="type-brands-title text-ish-ink">
          <Lines lines={trustedBrands.title} />
        </h2>
        <ul className="flex flex-wrap gap-x-[0.7em] type-brands font-bold text-ish-blue">
          {names.map((name) => {
            const brand = brandFor(name);
            return (
              <li key={name}>
                {brand ? (
                  <SmartLink
                    href={productLinks.brand(brand.slug)}
                    className="decoration-2 underline-offset-[0.14em] transition-colors hover:text-ish-blue-deep hover:underline"
                  >
                    {name}
                  </SmartLink>
                ) : (
                  name
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
