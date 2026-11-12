"use client";

import { useRef, type ReactNode } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { STOPS } from "@/data/story";
import { useJourneyFrame, useProjectIndex } from "@/hooks/useJourney";
import type { ContactStop, ProjectsStop, SkillsStop, Stop } from "@/types/story";

const labelClass = "font-mono text-[11px] uppercase tracking-[0.2em] text-signal";
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
      ? "text-5xl md:text-8xl"
      : "text-4xl md:text-6xl";
  return <Tag className={`font-display leading-[1.05] text-balance ${size}`}>{children}</Tag>;
}

function SkillsList({ stop }: { readonly stop: SkillsStop }) {
  return (
    <dl className="grid max-w-3xl gap-x-10 gap-y-4 sm:grid-cols-2">
      {stop.groups.map((group) => (
        <div key={group.label}>
          <dt className={labelClass}>{group.label}</dt>
          <dd className="mt-1 text-sm leading-relaxed text-paper/90">{group.items.join(" · ")}</dd>
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
      <div className="flex flex-col gap-3 font-mono text-sm sm:text-base">
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
      <ul className="mt-6 space-y-1 font-mono text-[11px] text-muted">
        {credits.map((credit) => (
          <li key={credit}>{credit}</li>
        ))}
      </ul>
    </>
  );
}

function ProjectsContent({ stop }: { readonly stop: ProjectsStop }) {
  const projectIndex = useProjectIndex();
  const project = stop.projects[projectIndex];

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
          <ProjectCard key={project.id} project={project} index={projectIndex} total={stop.projects.length} />
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
      <p className="max-w-xl text-base leading-relaxed text-muted md:text-lg">{stop.body}</p>
      {stop.kind === "skills" && <SkillsList stop={stop} />}
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
        className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-ink/80 via-ink/35 to-transparent md:w-3/4"
      />
      {STOPS.map((stop, index) => (
        <section
          key={stop.id}
          ref={(element) => {
            sectionRefs.current[index] = element;
          }}
          aria-label={stop.eyebrow}
          className={`pointer-events-none absolute inset-0 flex flex-col gap-6 px-6 pt-24 pb-24 will-change-[opacity,transform] md:px-16 ${
            // In the gallery the heading sits high and the card low, so the billboards stay visible between.
            stop.kind === "projects" ? "justify-between" : "justify-center"
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
