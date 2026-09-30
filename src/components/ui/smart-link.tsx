import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

export interface SmartLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  children: ReactNode;
}

/**
 * Renders the right element for a destination:
 * - in-page anchors and tel:/mailto: → plain <a>
 * - http(s) URLs → new tab with safe rel
 * - app routes → next/link (client-side navigation + prefetch)
 */
export function SmartLink({ href, children, ...props }: SmartLinkProps) {
  if (href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
