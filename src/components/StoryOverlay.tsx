"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { STOPS } from "@/data/story";
import { useJourneyFrame, useProjectIndex } from "@/hooks/useJourney";
import type {
  ChapterStop,
  ContactStop,
  ProjectsStop,
  StatsStop,
  Stop,
  TimelineStop,
} from "@/types/story";

const labelClass = "text-[11px] font-medium uppercase tracking-[0.26em] text-signal";
const linkClass =
  "pointer-events-auto border-b border-signal pb-0.5 text-paper transition-colors hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal";

interface HeadingProps {
  readonly level: 1 | 2;
  readonly compact?: boolean;
  readonly children: ReactNode;
}

function Heading({ level, compact = false, children }: HeadingProps) {
  const Tag = level === 1 ? "h1" : "h2";
  const size = compact
    ? "text-3xl md:text-5xl"
    : level === 1
      ? "text-6xl md:text-9xl"
      : "text-4xl md:text-6xl";
  return <Tag className={`font-display leading-[1.04] text-balance ${size}`}>{children}</Tag>;
}

function Timeline({ stop }: { readonly stop: TimelineStop }) {
  return (
    <ol className="max-w-2xl space-y-4 border-l border-paper/20 pl-5">
      {stop.entries.map((entry) => (
        <li key={entry.years} className="relative">
          <span aria-hidden="true" className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-signal" />
          <p className={labelClass}>{entry.years}</p>
          <p className="font-display text-xl leading-snug md:text-2xl">{entry.title}</p>
          <p className="text-xs text-muted">{entry.place}</p>
          <p className="mt-1 text-sm leading-relaxed text-paper/85">{entry.note}</p>
        </li>
      ))}
    </ol>
  );
}

/** The company's logo on a light chip, or its initials when no logo file is present. */
function CompanyLogo({ logo, company }: { readonly logo?: string; readonly company: string }) {
  const [failed, setFailed] = useState(false);
  const initials = company
    .split(/[\s,]+/)
    .filter((word) => /^[A-Z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper">
      {logo && !failed ? (
        <Image
          src={logo}
          alt={`${company} logo`}
          width={96}
          height={96}
          unoptimized
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      ) : (
        <span aria-hidden="true" className="font-display text-xl leading-none text-ink">
          {initials}
        </span>
      )}
    </span>
  );
}

function Chapter({ stop }: { readonly stop: ChapterStop }) {
  return (
    <div className="max-w-xl space-y-3">
      <div className="flex items-center gap-3">
        <CompanyLogo logo={stop.logo} company={stop.company} />
        <p className="text-xs leading-snug text-paper">
          {stop.role}
          <span className="block text-muted">{stop.company}</span>
        </p>
      </div>
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{stop.period}</p>
      <ul className="space-y-1.5 text-sm leading-relaxed text-paper/90">
        {stop.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span aria-hidden="true" className="text-signal">—</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-signal">{stop.shift}</p>
      <dl className="grid max-w-sm gap-1.5 text-[11px] uppercase tracking-[0.2em]">
        {stop.meters.map((meter) => (
          <div key={meter.label} className="flex items-center gap-3">
            <dt className="w-32 shrink-0 text-muted">{meter.label}</dt>
            <dd className="flex flex-1 gap-0.5" aria-label={`${meter.value} out of 10`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`h-1.5 flex-1 ${i < meter.value ? "bg-signal" : "bg-paper/15"}`} />
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Stats({ stop }: { readonly stop: StatsStop }) {
  return (
    <dl className="grid max-w-2xl grid-cols-2 gap-x-8 gap-y-5">
      {stop.stats.map((stat) => (
        <div key={stat.label}>
          <dt className="font-display text-6xl leading-none text-signal md:text-7xl">{stat.value}</dt>
          <dd className="mt-1 text-sm text-paper/85">{stat.label}</dd>
        </div>
      ))}
    </dl>
  );
}

function ContactLinks({
  stop,
  credits,
}: {
  readonly stop: ContactStop;
  readonly credits: readonly string[];
}) {
  return (
    <>
      <div className="flex flex-col gap-3 text-sm sm:text-base">
        <a href={`mailto:${stop.email}`} className={`${linkClass} w-fit`}>
          {stop.email}
        </a>
        <a
          href={stop.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} w-fit`}
        >
          {stop.linkedinLabel}
        </a>
      </div>
      <ul className="mt-6 space-y-1 text-[11px] text-muted">
        {credits.map((credit) => (
          <li key={credit}>{credit}</li>
        ))}
      </ul>
    </>
  );
}

/** Index of a projects stop's first billboard among all billboards. */
function useRunOffset(stop: ProjectsStop): number {
  let offset = 0;
  for (const other of STOPS) {
    if (other === stop) return offset;
    if (other.kind === "projects") offset += other.projects.length;
  }
  return offset;
}

function ProjectsContent({ stop }: { readonly stop: ProjectsStop }) {
  const projectIndex = useProjectIndex();
  // The billboard index counts across both runs; this stop owns the slice that matches its first project.
  const offset = useRunOffset(stop);
  const local = projectIndex - offset;
  const project = local >= 0 ? stop.projects[local] : undefined;

  return (
    <>
      <div className="max-w-xl space-y-3">
        <p className={labelClass}>{stop.eyebrow}</p>
        <Heading level={2} compact>
          {stop.heading}
        </Heading>
        <p className="text-muted">{stop.body}</p>
      </div>
      {project && (
        // Even projects stand on the left, so their card goes to the right, and the reverse.
        <div className={`flex ${projectIndex % 2 === 0 ? "md:justify-end" : "md:justify-start"}`}>
          <ProjectCard key={project.id} project={project} index={local} total={stop.projects.length} />
        </div>
      )}
    </>
  );
}

interface StopContentProps {
  readonly stop: Stop;
  readonly index: number;
  readonly credits: readonly string[];
}

function StopContent({ stop, index, credits }: StopContentProps) {
  if (stop.kind === "projects") return <ProjectsContent stop={stop} />;

  return (
    <div className="max-w-2xl space-y-4">
      <p className={labelClass}>{stop.eyebrow}</p>
      <Heading level={index === 0 ? 1 : 2}>{stop.heading}</Heading>
      <p className="max-w-xl text-sm leading-relaxed text-paper/75 md:text-lg">{stop.body}</p>
      {stop.kind === "timeline" && <Timeline stop={stop} />}
      {stop.kind === "chapter" && <Chapter stop={stop} />}
      {stop.kind === "stats" && <Stats stop={stop} />}
      {stop.kind === "contact" && <ContactLinks stop={stop} credits={credits} />}
    </div>
  );
}

interface StoryOverlayProps {
  readonly credits: readonly string[];
}

/** The words of the story. Each stop fades in and out from the animation loop. */
export function StoryOverlay({ credits }: StoryOverlayProps) {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useJourneyFrame((state) => {
    state.opacities.forEach((opacity, index) => {
      const element = sectionRefs.current[index];
      if (!element) return;
      element.style.opacity = opacity.toFixed(3);
      element.style.visibility = opacity < 0.01 ? "hidden" : "visible";
      element.style.transform = `translate3d(0, ${((1 - opacity) * 24).toFixed(1)}px, 0)`;
    });
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* A dark wash on the left keeps the text readable over the bright circuit. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/70 to-ink/55 md:inset-y-0 md:right-auto md:w-3/4 md:bg-gradient-to-r md:from-ink/80 md:via-ink/35 md:to-transparent"
      />
      {STOPS.map((stop, index) => (
        <section
          key={stop.id}
          ref={(element) => {
            sectionRefs.current[index] = element;
          }}
          aria-label={stop.eyebrow}
          className={`pointer-events-none absolute inset-0 flex flex-col gap-6 px-6 pt-20 pb-16 md:px-16 md:pt-24 md:pb-24 ${
            // In the gallery the heading sits high and the card low, so the billboards stay visible between.
            stop.kind === "projects" ? "justify-between pb-6 md:pb-44" : "justify-start md:justify-center"
          }`}
          style={{
            opacity: index === 0 ? 1 : 0,
            visibility: index === 0 ? "visible" : "hidden",
          }}
        >
          <StopContent stop={stop} index={index} credits={credits} />
        </section>
      ))}
    </div>
  );
}
