"use client";

import { useEffect, useRef, useState } from "react";

import { CloseIcon, PlayIcon } from "@/components/icons";
import { lockScroll } from "@/lib/smooth-scroll";

const ringClasses =
  "relative flex size-20 items-center justify-center rounded-full border-2 border-white/80 bg-black/30 pl-1 text-white backdrop-blur-[6px] shadow-[0_0_0_10px_rgb(255_255_255/0.15),0_0_0_20px_rgb(255_255_255/0.05)]";

/**
 * Play control over the rooftop photo. Opens an embedded video when a tour URL is
 * configured (NEXT_PUBLIC_SOLAR_TOUR_VIDEO_URL); otherwise it renders as a static accent.
 */
export function VideoTourButton({ videoUrl, label }: { videoUrl?: string; label: string }) {
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

  if (!videoUrl) {
    return (
      <span aria-hidden="true" className={ringClasses}>
        <span className="absolute inset-0 animate-pulse-ring rounded-full border border-white/60" />
        <PlayIcon className="size-8" />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={`${ringClasses} transition-transform duration-300 ease-out-expo hover:scale-105`}
      >
        <span aria-hidden="true" className="absolute inset-0 animate-pulse-ring rounded-full border border-white/60" />
        <PlayIcon className="size-8" />
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
            <iframe
              src={videoUrl}
              title={label}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
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
