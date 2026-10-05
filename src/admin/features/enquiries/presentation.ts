import type { BadgeTone } from "@/admin/components/ui/primitives";
import { siteForms } from "@/admin/config/forms";
import type { EnquiryStatus } from "@/admin/content/types";

/** Client-safe display helpers for enquiries. */
export const enquiryStatusTone: Record<EnquiryStatus, BadgeTone> = {
  new: "blue",
  contacted: "violet",
  quoted: "amber",
  won: "leaf",
  lost: "slate",
  spam: "red",
};

export const enquiryStatusHints: Record<EnquiryStatus, string> = {
  new: "Not handled yet",
  contacted: "Spoke to / messaged the client",
  quoted: "Price or quotation sent",
  won: "Order confirmed",
  lost: "Didn’t buy",
  spam: "Junk — hidden from reports",
};

/** The form's name and where it lives, for forms that may have been renamed or removed since. */
export function formInfo(formKey: string, storedName: string) {
  const form = (siteForms as Record<string, { name: string; location: string; description: string } | undefined>)[
    formKey
  ];
  return {
    name: form?.name ?? storedName,
    location: form?.location ?? "No longer on the website",
    description: form?.description ?? "",
  };
}

/** A short device description from a user-agent string ("Android phone · Chrome"). */
export function describeDevice(userAgent: string) {
  if (!userAgent) return "";
  const os = /Android/i.test(userAgent)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? "iOS"
      : /Windows/i.test(userAgent)
        ? "Windows"
        : /Mac OS X|Macintosh/i.test(userAgent)
          ? "Mac"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "Unknown OS";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /SamsungBrowser/.test(userAgent)
        ? "Samsung Internet"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Firefox\//.test(userAgent)
            ? "Firefox"
            : /Safari\//.test(userAgent)
              ? "Safari"
              : "Browser";
  const mobile = /Mobi|Android|iPhone/i.test(userAgent) ? " phone" : "";
  return `${os}${mobile} · ${browser}`;
}
