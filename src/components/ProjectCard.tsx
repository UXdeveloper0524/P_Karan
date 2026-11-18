"use client";

import Image from "next/image";
import { useState } from "react";
import type { Project } from "@/types/story";

interface ProjectCardProps {
  readonly project: Project;
  /** Position inside the current run of billboards. */
  readonly index: number;
  readonly total: number;
}

const pad = (value: number): string => String(value).padStart(2, "0");

export function ProjectCard({ project, index, total }: ProjectCardProps) {
  const live = project.status === "live";
  const [previewFailed, setPreviewFailed] = useState(false);

  return (
    <article className="pointer-events-auto w-full max-w-sm animate-card-in overflow-hidden rounded-md border border-paper/15 bg-ink/90">
      {project.preview && !previewFailed && (
        <div className="relative aspect-[16/8] w-full overflow-hidden border-b border-paper/10">
          <Image
            src={project.preview}
            alt={`${project.name} website preview`}
            fill
            sizes="384px"
            unoptimized
            onError={() => setPreviewFailed(true)}
            className="object-cover object-top"
          />
        </div>
      )}
      <div className="p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-signal">
          {live ? "Live" : "In development"} · {pad(index + 1)} / {pad(total)}
        </p>
        <h3 className="mt-2 font-display text-3xl leading-none">{project.name}</h3>
        {project.stack && <p className="mt-1 text-xs text-muted">{project.stack}</p>}
        <p className="mt-3 text-sm leading-relaxed text-paper/85">{project.summary}</p>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block border-b border-signal pb-0.5 text-xs text-paper transition-colors hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
          >
            Visit site <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
