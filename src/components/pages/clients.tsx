import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";

import type { PublicTestimonial } from "@/admin/content/public-types";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { RailProgress } from "@/components/ui/rail-progress";
import { VideoDialog } from "@/components/ui/video-dialog";
import { clientReviews, featuredStory, industries, videoStories } from "@/content/clients";
import { cn } from "@/lib/cn";
import { toPlayable, type Playable } from "@/lib/video";

import { FigmaIcon } from "./figma-icons";
import { ReviewGrid } from "./review-grid";

/** A video link from the admin with the running time printed on its thumbnail. */
export interface ClientVideo {
  url: string;
  length: string;
}

/**
 * A thumbnail that opens its video in a dialog — or, while the admin has no link for it, a plain
 * picture: no play button or running time, so visitors never meet a dead control.
 */
function VideoFrame({
  playable,
  label,
  className,
  children,
}: {
  playable: Playable | null;
  label: string;
  className: string;
  children: ReactNode;
}) {
  return playable ? (
    <VideoDialog playable={playable} label={label} className={cn("group block w-full cursor-pointer", className)}>
      {children}
    </VideoDialog>
  ) : (
    <div className={className}>{children}</div>
  );
}

function PlayButton({ size }: { size: "large" | "small" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid place-items-center rounded-full bg-white/95 transition-transform duration-500 ease-out-expo group-hover:scale-110 group-focus-visible:scale-110",
        size === "large"
          ? "size-16 shadow-[0_23px_29px_-6px_rgb(0_0_0/0.1),0_9px_12px_-7px_rgb(0_0_0/0.1)] lg:size-[74px]"
          : "size-[52px] shadow-[0_4.6px_7px_-1.2px_rgb(0_0_0/0.1),0_2.3px_4.6px_-2.3px_rgb(0_0_0/0.1)] lg:size-[56px]",
      )}
    >
      <FigmaIcon
        name={size === "large" ? "play" : "playSmall"}
        className={size === "large" ? "ml-1 h-[20px] w-[17px]" : "ml-0.5 h-[14px] w-3"}
      />
    </span>
  );
}

function SectionIntro({
  id,
  eyebrow,
  title,
  description,
  eyebrowClassName,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  eyebrowClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-[5px] pt-1.5">
      <p
        className={cn(
          "font-display text-[12.5px] leading-[18.6px] font-bold tracking-[0.1em] text-[#748f0f] uppercase sm:text-[13.96px]",
          eyebrowClassName,
        )}
      >
        {eyebrow}
      </p>
      <h2
        id={id}
        className="pt-[5px] font-display text-[clamp(1.6rem,1.25rem+1.4vw,2.18rem)] leading-[1.2] font-bold tracking-[-0.02em] text-[#0f172a]"
      >
        {title}
      </h2>
      {description ? (
        <p className="font-display text-[15px] leading-[1.45] text-[#64748b] sm:text-[16.25px]">{description}</p>
      ) : null}
    </div>
  );
}

/** "Hear It From Our Clients": one wide video (Figma 297:1150). */
export function FeaturedStory({ video }: { video: ClientVideo }) {
  const playable = toPlayable(video.url);
  return (
    <section
      aria-labelledby="featured-story-title"
      className="border-t border-[#f1f5f9] bg-[#eaf6fc] py-12 sm:py-14 lg:pt-[66px] lg:pb-[65px]"
    >
      <div className="container-site flex flex-col gap-7 lg:gap-[37px]">
        <Reveal>
          <SectionIntro
            id="featured-story-title"
            eyebrow={featuredStory.eyebrow}
            title={featuredStory.title}
            description={featuredStory.description}
          />
        </Reveal>

        <Reveal delay={0.08} y={24}>
          <VideoFrame
            playable={playable}
            label={`Play the video: ${featuredStory.title}`}
            className="relative isolate aspect-video overflow-hidden rounded-[18px] border border-[rgb(226_232_240/0.8)] bg-[#1e293b] shadow-[0_11.6px_17.4px_-3.5px_rgb(0_0_0/0.1),0_4.6px_7px_-4.6px_rgb(0_0_0/0.1)] sm:aspect-[2/1] lg:aspect-auto lg:h-[395px]"
          >
            <Image
              src={featuredStory.poster.src}
              alt={featuredStory.poster.alt}
              fill
              sizes="(min-width: 1440px) 1360px, 100vw"
              placeholder="blur"
              className="-z-10 scale-[1.12] object-cover"
            />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[rgb(15_23_42/0.2)]" />
            {playable ? (
              <span className="absolute inset-0 grid place-items-center">
                <PlayButton size="large" />
              </span>
            ) : null}
            <span className="absolute bottom-3 left-3 flex items-center gap-[7px] rounded-[7px] bg-black/60 px-3 py-1 backdrop-blur-[7px] sm:bottom-[18px] sm:left-[18px] sm:px-[14px]">
              <FigmaIcon name="homeTag" className="h-[11.6px] w-[13px] shrink-0" />
              <span className="text-[13px] leading-[18.6px] text-white sm:text-[13.96px]">{featuredStory.tag}</span>
            </span>
            {playable && video.length ? (
              <span className="absolute right-3 bottom-3 rounded-[7px] bg-black/75 px-[11px] py-[3px] font-jetbrains text-[12.5px] leading-[18.6px] font-bold text-white backdrop-blur-[7px] sm:right-[19px] sm:bottom-[18px] sm:text-[13.5px]">
                <span className="sr-only">Length </span>
                {video.length}
              </span>
            ) : null}
          </VideoFrame>
        </Reveal>
      </div>
    </section>
  );
}

/** "Different Needs. One Reliable Partner." — eight sector cards (Figma 297:1166). */
export function Industries() {
  return (
    <section aria-labelledby="industries-title" className="bg-white py-14 sm:py-16 lg:pt-[78px] lg:pb-[63px]">
      <div className="container-site">
        <Reveal className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:pb-2.5">
          <div className="flex flex-col gap-2.5">
            <p className="font-display text-[12.5px] leading-[19.6px] font-extrabold tracking-[0.1em] text-[#748f0f] uppercase sm:text-[14.7px]">
              {industries.eyebrow}
            </p>
            <h2
              id="industries-title"
              className="font-display text-[clamp(1.7rem,1.2rem+2vw,2.56rem)] leading-[1.3] font-extrabold tracking-[-0.027em] text-[#0a1c33]"
            >
              {industries.title}
            </h2>
          </div>
          <p className="max-w-[549px] font-display text-[15px] leading-[1.625] text-[#424753] sm:text-[17.17px]">
            {industries.description}
          </p>
        </Reveal>

        <RevealGroup
          as="ul"
          stagger={0.06}
          className="mt-8 grid gap-6 max-md:mobile-rail max-md:[--rail-item:min(78%,18.5rem)] md:grid-cols-2 lg:mt-[49px] lg:grid-cols-4 lg:gap-[29px]"
        >
          {industries.items.map((item) => (
            <RevealItem as="li" key={item.title} className="flex">
              <article className="group flex w-full flex-col rounded-[19.6px] bg-white p-[15px] shadow-[0_1px_2px_rgb(15_23_42/0.06),0_0_0_1px_rgb(15_23_42/0.04)] transition-[translate,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-[0_22px_40px_-28px_rgb(10_28_51/0.45),0_0_0_1px_rgb(15_23_42/0.04)] sm:p-[17px]">
                <div className="relative isolate overflow-hidden rounded-[14.7px] bg-[#e7eeff]">
                  <div className="relative h-[180px] overflow-hidden sm:h-[191px]">
                    <Image
                      src={item.image.src}
                      alt={item.image.alt}
                      fill
                      sizes="(min-width: 1024px) 300px, (min-width: 768px) 45vw, 78vw"
                      placeholder="blur"
                      className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.05]"
                    />
                  </div>
                  <span className="absolute -bottom-[15px] left-[19px] grid size-[49px] place-items-center rounded-full bg-white shadow-[0_4.9px_7.4px_-1.2px_rgb(0_0_0/0.1),0_2.5px_4.9px_-2.5px_rgb(0_0_0/0.1)]">
                    <FigmaIcon name={item.icon} className="h-[18.4px] w-auto max-w-5" />
                  </span>
                </div>
                <div className="flex flex-col gap-[7px] px-[5px] pt-[26px] pb-3 sm:pt-[29px]">
                  <h3 className="font-display text-[20px] leading-[1.42] font-bold tracking-[-0.01em] text-[#0a1c33] sm:text-[22px]">
                    {item.title}
                  </h3>
                  <p className="font-display text-[14px] leading-[1.625] text-[#424753] sm:text-[14.7px]">
                    {item.text}
                  </p>
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
        <RailProgress />
      </div>
    </section>
  );
}

/** "Real Experiences from Real People": the testimonials from the admin, six at a time (Figma 297:1340). */
export function ClientReviews({ items }: { items: PublicTestimonial[] }) {
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="client-reviews-title"
      className="bg-[linear-gradient(-3.34deg,#eaf6fc_4.6%,#fff_98%)] py-14 sm:py-16 lg:pt-[66px] lg:pb-[70px]"
    >
      <div className="container-site">
        <Reveal>
          <SectionIntro id="client-reviews-title" eyebrow={clientReviews.eyebrow} title={clientReviews.title} />
        </Reveal>
        <ReviewGrid items={items} initial={clientReviews.initial} moreLabel={clientReviews.more} />
      </div>
    </section>
  );
}

/** "Video Stories from Our Clients": three short videos and the channel link (Figma 297:1426). */
export function VideoStories({ videos, channelUrl }: { videos: ClientVideo[]; channelUrl: string }) {
  return (
    <section aria-labelledby="video-stories-title" className="bg-white">
      <div className="container-site">
        <div className="-mx-(--gutter) border-t border-[#f1f5f9] bg-[#f9fafb] px-(--gutter) py-14 sm:py-16 lg:-mx-6 lg:px-6 lg:pt-[75px] lg:pb-[74px]">
          <Reveal className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro
              id="video-stories-title"
              eyebrow={videoStories.eyebrow}
              title={videoStories.title}
              description={videoStories.description}
              eyebrowClassName="font-normal"
            />
            {channelUrl ? (
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-[50px] shrink-0 items-center gap-[9px] self-start rounded-[14px] border border-[#0d53c6] px-5 text-[16.2px] leading-[23px] font-bold text-[#0d53c6] transition-colors duration-300 hover:bg-[#0d53c6] hover:text-white sm:self-auto"
              >
                {videoStories.viewAll}
                <span className="sr-only"> (opens YouTube)</span>
                <FigmaIcon
                  name="arrowBlue"
                  className="h-[10.4px] w-[12.2px] transition-transform duration-300 ease-out-expo group-hover:translate-x-1 group-hover:[&_path]:fill-white"
                />
              </a>
            ) : null}
          </Reveal>

          <RevealGroup
            as="ul"
            stagger={0.08}
            className="mt-8 grid gap-6 max-md:mobile-rail max-md:[--rail-item:min(82%,21rem)] md:grid-cols-3 lg:mt-[37px] lg:gap-[37px]"
          >
            {videoStories.items.map((story, index) => {
              const video = videos[index];
              const playable = toPlayable(video?.url);
              return (
                <RevealItem as="li" key={story.title} className="flex flex-col gap-3.5">
                  <VideoFrame
                    playable={playable}
                    label={`Play the video: ${story.title}`}
                    className="relative isolate aspect-[16/10] overflow-hidden rounded-[18.5px] bg-[#0f172a] shadow-[0_1px_2px_rgb(0_0_0/0.05)]"
                  >
                    <PosterImage poster={story.poster} />
                    {playable ? (
                      <span className="absolute inset-0 grid place-items-center bg-[rgb(15_23_42/0.2)]">
                        <PlayButton size="small" />
                      </span>
                    ) : null}
                    {playable && video?.length ? (
                      <span className="absolute right-3 bottom-3 rounded-[4.6px] bg-black/80 px-[9px] py-[2px] font-jetbrains text-[12.75px] leading-[19px] text-white">
                        <span className="sr-only">Length </span>
                        {video.length}
                      </span>
                    ) : null}
                  </VideoFrame>
                  <h3 className="text-[17px] leading-[1.5] font-bold text-[#0f172a] sm:text-[18.5px]">{story.title}</h3>
                </RevealItem>
              );
            })}
          </RevealGroup>
          <RailProgress />
        </div>
      </div>
    </section>
  );
}

function PosterImage({ poster }: { poster: { src: StaticImageData; alt: string } }) {
  return (
    <Image
      src={poster.src}
      alt={poster.alt}
      fill
      sizes="(min-width: 1024px) 445px, (min-width: 768px) 31vw, 82vw"
      placeholder="blur"
      className="-z-10 object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
    />
  );
}
