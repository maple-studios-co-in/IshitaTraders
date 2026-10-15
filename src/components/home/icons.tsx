import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Line icons from the website design's sprite (24 px grid, 1.7 px strokes in the current colour). */
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

export function UpRightIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </LineIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M5 12h14M12 5v14" />
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

export function SunLineIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </LineIcon>
  );
}

export function BoltLineIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="m14 2-9 12h6l-1 8 9-12h-6z" />
    </LineIcon>
  );
}

export function ShieldLineIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="m12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5zM8 12l3 3 5-6" />
    </LineIcon>
  );
}

export function PinLineIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="9" r="2" />
    </LineIcon>
  );
}

export function BagLineIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 8h16v13H4zM8 8V5a4 4 0 0 1 8 0v3" />
    </LineIcon>
  );
}
