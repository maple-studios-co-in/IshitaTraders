import Image from "next/image";

import logo from "@/assets/images/brand/logo.png";
import { ButtonLink } from "@/components/ui/button";
import { whatsappHref } from "@/lib/contact-links";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-section-fade px-6 text-center">
      <Image src={logo} alt="Ishita Traders" sizes="120px" className="h-24 w-auto" />
      <p className="text-sm font-bold tracking-[0.1em] text-leaf-600 uppercase">404 — Page not found</p>
      <h1 className="max-w-xl font-display text-4xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
        This page has switched off.
      </h1>
      <p className="max-w-md text-slate-600">The page you are looking for doesn’t exist or has moved.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" size="lg">
          Back to home
        </ButtonLink>
        <ButtonLink href={whatsappHref()} variant="outline" size="lg">
          WhatsApp us
        </ButtonLink>
      </div>
    </main>
  );
}
