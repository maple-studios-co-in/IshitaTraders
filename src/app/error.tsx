"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { phoneHref } from "@/lib/contact-links";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-section-fade px-6 text-center">
      <p className="text-sm font-bold tracking-[0.1em] text-leaf-600 uppercase">Something went wrong</p>
      <h1 className="max-w-xl font-display text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        We hit a snag loading this page.
      </h1>
      <p className="max-w-md text-slate-600">
        Please try again. If it keeps happening, call us on {siteConfig.phone.display} — we’re happy to help.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset} size="lg">
          Try again
        </Button>
        <ButtonLink href={phoneHref} variant="accent" size="lg">
          Call {siteConfig.phone.display}
        </ButtonLink>
      </div>
    </main>
  );
}
