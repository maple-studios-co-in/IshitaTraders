"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { CloseIcon } from "@/components/icons";
import { lockScroll } from "@/lib/smooth-scroll";
import type { Playable } from "@/lib/video";

/**
 * A poster that plays its video in a full-screen dialog. Render it only for a playable link (see
 * `toPlayable` in lib/video); without one, show the poster as a plain picture instead.
 */
export function VideoDialog({
  playable,
  label,
  className,
  children,
}: {
  playable: Playable;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      lockScroll(true);
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      if (open) lockScroll(false);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} className={className}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === dialogRef.current && setOpen(false)}
        aria-label={label}
        className="m-auto w-[min(92vw,1100px)] overflow-visible bg-transparent p-0 backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl">
          {open ? (
            playable.kind === "video" ? (
              <video src={playable.src} controls autoPlay playsInline className="absolute inset-0 size-full" />
            ) : (
              <iframe
                src={playable.src}
                title={label}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            )
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close video"
          className="absolute -top-12 right-0 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <CloseIcon className="size-5" />
        </button>
      </dialog>
    </>
  );
}
