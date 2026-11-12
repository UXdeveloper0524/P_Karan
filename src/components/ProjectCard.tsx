import type { Project } from "@/types/story";

interface ProjectCardProps {
  readonly project: Project;
  readonly index: number;
  readonly total: number;
}

const pad = (value: number): string => String(value).padStart(2, "0");

export function ProjectCard({ project, index, total }: ProjectCardProps) {
  return (
    <article className="pointer-events-auto max-w-sm animate-card-in rounded-sm border border-paper/20 bg-ink/80 p-5 backdrop-blur-sm">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
        Project {pad(index + 1)} / {pad(total)}
      </p>
      <h3 className="mt-2 font-display text-3xl leading-tight">{project.name}</h3>
      <p className="mt-1 font-mono text-xs text-muted">{project.role}</p>
      <p className="mt-3 text-sm leading-relaxed text-paper/85">{project.summary}</p>
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block border-b border-signal pb-0.5 font-mono text-xs text-paper transition-colors hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
      >
        Visit {project.domain} <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
