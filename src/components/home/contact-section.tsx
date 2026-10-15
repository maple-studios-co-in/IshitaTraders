import { contactLinks } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";
import { sectionIds } from "@/config/navigation";
import { contactSection } from "@/content/homepage";

import { EnquiryForm } from "./enquiry-form";
import { Lines } from "./ui";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** The address in the design's two lines ("Chakia, East Champaran" / "Bihar 845412, India"). */
function addressLines(address: {
  locality: string;
  district: string;
  region: string;
  postalCode: string;
  country: string;
  display: string;
}) {
  const first = [address.locality, address.district].filter(Boolean).join(", ");
  let country = "";
  try {
    country = address.country ? (regionNames.of(address.country.toUpperCase()) ?? address.country) : "";
  } catch {
    country = address.country;
  }
  const second = [[address.region, address.postalCode].filter(Boolean).join(" "), country].filter(Boolean).join(", ");
  return first && second ? [first, second] : [address.display];
}

/**
 * "Let’s power your next step.": phone, email and address from Admin → Business / Contact, and the
 * enquiry form that continues on WhatsApp. Every page with the site header ends with it, so the
 * header's "Contact us" always scrolls here.
 */
export async function ContactSection() {
  const { contact, business } = await getSiteSettings();
  const links = contactLinks(contact);
  return (
    <section
      id={sectionIds.contact}
      aria-labelledby="contact-title"
      className="anchor-band bg-ish-blue font-archivo text-white focus-on-dark"
    >
      <div className="band flex flex-col gap-[45px]">
        <h2 id="contact-title" className="type-contact-title">
          <Lines lines={contactSection.title} />
        </h2>
        <div className="grid items-start gap-[50px] lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <p className="type-contact-sub">
              <Lines lines={contactSection.subtitle} />
            </p>
            <address className="text-[16px] leading-[1.5] not-italic">
              <a href={links.phone} className="block w-fit underline-offset-4 hover:underline">
                {contact.phoneDisplay}
              </a>
              <a href={links.mailto()} className="block w-fit break-all underline-offset-4 hover:underline">
                {contact.email}
              </a>
              <span className="mt-6 block">
                <Lines lines={addressLines(business.address)} />
              </span>
            </address>
          </div>
          <EnquiryForm
            whatsappNumber={contact.whatsappNumber}
            businessName={business.name}
            interests={[...contactSection.interests]}
            submitLabel={contactSection.submit}
            note={contactSection.note}
          />
        </div>
      </div>
    </section>
  );
}
