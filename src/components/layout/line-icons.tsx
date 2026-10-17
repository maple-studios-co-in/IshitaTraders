import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Line icons of the navigation and hero (24 px grid, 1.7 px strokes in the current colour). */
function LineIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </LineIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </LineIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </LineIcon>
  );
}

export function MenuLinesIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 9h16M4 15h16" />
    </LineIcon>
  );
}

export function CloseLineIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </LineIcon>
  );
}
