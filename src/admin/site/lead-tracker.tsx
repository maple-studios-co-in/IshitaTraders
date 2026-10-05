"use client";

import { useEffect } from "react";

import { captureAttribution, UTM_STORAGE_KEY } from "./attribution";

/**
 * Logs clicks on WhatsApp, call and email links so they show up in Admin → Inbox → Contact clicks
 * (who reached out, from which section/product, with which pre-filled message). No cookies, no
 * personal data; one beacon per click, sent without delaying the navigation.
 */
export function LeadTracker() {
  useEffect(() => {
    captureAttribution();

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.href;
      const type = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)
        ? "whatsapp"
        : href.startsWith("tel:")
          ? "call"
          : href.startsWith("mailto:")
            ? "email"
            : null;
      if (!type) return;

      let message = "";
      let target = "";
      try {
        const url = new URL(href);
        if (type === "whatsapp") message = url.searchParams.get("text") ?? "";
        if (type === "email") message = url.searchParams.get("subject") ?? "";
        target = type === "whatsapp" ? url.pathname.replace(/\D/g, "") : decodeURIComponent(url.pathname);
      } catch {
        // Malformed link: log the click without details.
      }

      let utm = {};
      try {
        utm = JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY) ?? "{}");
      } catch {}

      const context =
        anchor.closest("[data-track-context]")?.getAttribute("data-track-context") ||
        anchor.closest("section[id]")?.id ||
        (anchor.closest("header") ? "header" : anchor.closest("footer") ? "footer" : "page");

      const payload = JSON.stringify({
        type,
        context,
        target,
        message: message.slice(0, 500),
        productSlug: anchor.closest("[data-product-slug]")?.getAttribute("data-product-slug") ?? "",
        path: window.location.pathname,
        referrer: document.referrer.slice(0, 300),
        utm,
      });
      // text/plain is a CORS-safelisted type, which every browser accepts for sendBeacon.
      const blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
      if (!navigator.sendBeacon?.("/api/track", blob)) {
        void fetch("/api/track", {
          method: "POST",
          body: payload,
          keepalive: true,
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
        }).catch(() => {});
      }
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
