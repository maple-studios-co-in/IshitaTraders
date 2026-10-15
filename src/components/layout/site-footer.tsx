import { getSiteSettings } from "@/admin/content/settings";
import { SmartLink } from "@/components/ui/smart-link";
import { anchor, navHref, productLinks, sectionIds, type NavLink } from "@/config/navigation";

const socialLabels = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
} as const;

const productLinksRow: NavLink[] = [
  { label: "Solar panels", sectionId: sectionIds.solar },
  { label: "Inverters", sectionId: sectionIds.inverters },
  { label: "Batteries", sectionId: sectionIds.batteries },
  { label: "Online UPS", sectionId: sectionIds.electrical },
];

const companyLinksRow: NavLink[] = [
  { label: "About Ishita", sectionId: sectionIds.about },
  { label: "Calculator", sectionId: sectionIds.calculator },
  { label: "FAQs", sectionId: sectionIds.faq },
];

/**
 * Figma "Footer": three big links, two rows of section links, the ISHITA wordmark and the
 * copyright line with the tagline (Admin → Business). Social profiles from Admin → Social join
 * that line once they're filled in. Pass `onHomepage={false}` on other pages so section links
 * lead back to the homepage.
 */
export async function SiteFooter({ onHomepage = true }: { onHomepage?: boolean }) {
  const { business, social } = await getSiteSettings();
  const socials = (Object.keys(socialLabels) as (keyof typeof socialLabels)[])
    .map((platform) => ({ platform, label: socialLabels[platform], href: social[platform] }))
    .filter((item) => item.href);
  const copyright = business.copyright.replaceAll("{year}", String(new Date().getFullYear()));

  return (
    <footer data-page-content aria-labelledby="footer-title" className="bg-white font-archivo text-ish-ink">
      <h2 id="footer-title" className="sr-only">
        {business.name}
      </h2>
      <div className="band flex flex-col gap-9">
        <nav aria-label="Footer" className="flex flex-col gap-9">
          <ul className="flex flex-wrap gap-x-[1.1em] gap-y-1 type-footer-links tracking-[-0.025em]">
            <li>
              <SmartLink href={productLinks.all} className="transition-colors hover:text-ish-blue">
                Products
              </SmartLink>
            </li>
            <li>
              <a
                href={navHref({ label: "Company", sectionId: sectionIds.about }, onHomepage)}
                className="transition-colors hover:text-ish-blue"
              >
                Company
              </a>
            </li>
            <li>
              <a href={anchor(sectionIds.contact)} className="transition-colors hover:text-ish-blue">
                Contact
              </a>
            </li>
          </ul>
          <div className="flex flex-col text-[14px] leading-[1.5] text-ish-muted">
            <LinkRow links={productLinksRow} onHomepage={onHomepage} />
            <LinkRow links={companyLinksRow} onHomepage={onHomepage} />
          </div>
        </nav>

        <div aria-hidden="true" className="flex flex-col gap-9 text-ish-blue select-none">
          <p className="-ml-[0.04em] type-wordmark font-bold">ISHITA</p>
          <p className="type-traders tracking-[0.45em]">TRADERS</p>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[11px] leading-[1.5] text-ish-muted">
          {copyright ? <p>{copyright}</p> : null}
          {business.tagline ? <p>{business.tagline}</p> : null}
          {socials.length > 0 ? (
            <ul aria-label="Social media" className="flex flex-wrap gap-x-4 sm:ml-auto">
              {socials.map((item) => (
                <li key={item.platform}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:text-ish-blue">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

function LinkRow({ links, onHomepage }: { links: NavLink[]; onHomepage: boolean }) {
  return (
    <ul className="flex flex-wrap">
      {links.map((link, index) => (
        <li key={link.label}>
          {index > 0 ? (
            <span aria-hidden="true" className="px-[0.3em]">
              ·
            </span>
          ) : null}
          <a href={navHref(link, onHomepage)} className="transition-colors hover:text-ish-ink">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
