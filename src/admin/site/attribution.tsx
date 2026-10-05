"use client";

export const UTM_STORAGE_KEY = "it_utm";
export const REFERRER_STORAGE_KEY = "it_ref";

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;

/**
 * Saves the visit's campaign tags (utm_* in the URL) and first external referrer for the browser
 * session. Idempotent: called by the lead tracker and by every form, whichever mounts first.
 */
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = params.get(`utm_${key}`);
      if (value) utm[key] = value.slice(0, 100);
    }
    if (Object.keys(utm).length > 0) sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    const referrer = document.referrer;
    if (referrer && !referrer.startsWith(window.location.origin) && !sessionStorage.getItem(REFERRER_STORAGE_KEY)) {
      sessionStorage.setItem(REFERRER_STORAGE_KEY, referrer.slice(0, 300));
    }
  } catch {
    // Storage unavailable (private mode): forms and click tracking work without attribution.
  }
}

/** Fills a hidden input from the session (as its default too, so a form reset keeps it). */
function fromSession(key: string) {
  return (element: HTMLInputElement | null) => {
    if (!element) return;
    captureAttribution();
    try {
      const value = sessionStorage.getItem(key) ?? "";
      element.defaultValue = value;
      element.value = value;
    } catch {
      // Storage unavailable: submit without attribution.
    }
  };
}

/** Hidden inputs carrying the visit's campaign tags and referrer; place inside any public form. */
export function AttributionFields() {
  return (
    <>
      <input type="hidden" name="utm" ref={fromSession(UTM_STORAGE_KEY)} />
      <input type="hidden" name="referrer" ref={fromSession(REFERRER_STORAGE_KEY)} />
    </>
  );
}
