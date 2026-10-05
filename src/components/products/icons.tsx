// Path data is copied verbatim from the Figma SVG exports of the products page (224:7144) and the
// product popup (219:2312). Same conventions as `@/components/icons`: currentColor, decorative.
import type { IconProps } from "@/components/icons";

function Svg({ viewBox, children, ...props }: IconProps & { viewBox: string }) {
  return (
    <svg viewBox={viewBox} fill="none" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

/** Chat bubble on the card's square enquiry button (224:7366); the viewBox crops the 44×42 button export to its icon. */
export function ChatIcon(props: IconProps) {
  return (
    <Svg viewBox="14 14 15 15" {...props}>
      <path
        d="M17 23H23V21.5H17V23V23M17 20.75H26V19.25H17V20.75V20.75M17 18.5H26V17H17V18.5V18.5M14 29V15.5C14 15.0875 14.1469 14.7344 14.4406 14.4406C14.7344 14.1469 15.0875 14 15.5 14H27.5C27.9125 14 28.2656 14.1469 28.5594 14.4406C28.8531 14.7344 29 15.0875 29 15.5V24.5C29 24.9125 28.8531 25.2656 28.5594 25.5594C28.2656 25.8531 27.9125 26 27.5 26H17L14 29V29M16.3625 24.5H27.5V24.5V24.5V15.5V15.5V15.5H15.5V15.5V15.5V25.3438L16.3625 24.5V24.5M15.5 24.5V24.5V15.5V15.5V15.5V15.5V15.5V15.5V24.5V24.5V24.5V24.5V24.5"
        fill="currentColor"
      />
    </Svg>
  );
}

/** Magnifier in the catalogue search box (224:7835). */
export function SearchIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 13.5 13.5" {...props}>
      <path
        d="M12.45 13.5L7.725 8.775C7.35 9.075 6.91875 9.3125 6.43125 9.4875C5.94375 9.6625 5.425 9.75 4.875 9.75C3.5125 9.75 2.35938 9.27813 1.41562 8.33438C0.471875 7.39063 0 6.2375 0 4.875C0 3.5125 0.471875 2.35938 1.41562 1.41562C2.35938 0.471875 3.5125 0 4.875 0C6.2375 0 7.39063 0.471875 8.33438 1.41562C9.27813 2.35938 9.75 3.5125 9.75 4.875C9.75 5.425 9.6625 5.94375 9.4875 6.43125C9.3125 6.91875 9.075 7.35 8.775 7.725L13.5 12.45L12.45 13.5V13.5M4.875 8.25C5.8125 8.25 6.60938 7.92188 7.26562 7.26562C7.92188 6.60938 8.25 5.8125 8.25 4.875C8.25 3.9375 7.92188 3.14062 7.26562 2.48438C6.60938 1.82812 5.8125 1.5 4.875 1.5C3.9375 1.5 3.14062 1.82812 2.48438 2.48438C1.82812 3.14062 1.5 3.9375 1.5 4.875C1.5 5.8125 1.82812 6.60938 2.48438 7.26562C3.14062 7.92188 3.9375 8.25 4.875 8.25V8.25"
        fill="currentColor"
      />
    </Svg>
  );
}

/** Close cross in the popup header (224:6953). */
export function DialogCloseIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 20 20" {...props}>
      <path
        d="M5 15L15 5M5 5L15 15"
        stroke="currentColor"
        strokeWidth={1.66667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Document with a down arrow on the datasheet strip (224:7046). */
export function DatasheetIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 9.6 12.8" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.6 0C0.716936 0 0 0.716936 0 1.6V11.2C0 12.0831 0.716936 12.8 1.6 12.8H8C8.88306 12.8 9.6 12.0831 9.6 11.2V4.3312C9.59991 3.90689 9.43128 3.49999 9.1312 3.2L6.4 0.4688C6.10001 0.168721 5.69311 9.06198e-05 5.2688 0H1.6V0M5.6 4.8C5.6 4.35847 5.24153 4 4.8 4C4.35847 4 4 4.35847 4 4.8V7.6688L2.9656 6.6344C2.76474 6.42643 2.4673 6.34303 2.18759 6.41624C1.90789 6.48945 1.68945 6.70789 1.61624 6.98759C1.54303 7.2673 1.62643 7.56474 1.8344 7.7656L4.2344 10.1656C4.5468 10.4779 5.0532 10.4779 5.3656 10.1656L7.7656 7.7656C8.06878 7.4517 8.06444 6.95273 7.75586 6.64415C7.44727 6.33556 6.9483 6.33122 6.6344 6.6344L5.6 7.6688V4.8V4.8"
        fill="currentColor"
      />
    </Svg>
  );
}

/** Shield with a tick beside the RFQ heading (224:7059). */
export function ShieldCheckIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" {...props}>
      <path
        d="M6 8L7.33333 9.33333L10 6.66667M13.7453 3.98933C11.6374 4.10128 9.57116 3.37241 8 1.96267C6.42884 3.37241 4.3626 4.10128 2.25467 3.98933C2.08502 4.64608 1.99945 5.3217 2 6C2 9.72733 4.54933 12.86 8 13.748C11.4507 12.86 14 9.728 14 6C14 5.30533 13.9113 4.632 13.7453 3.98933L6 8"
        stroke="currentColor"
        strokeWidth={1.33333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
