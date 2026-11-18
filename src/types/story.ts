/** Identifies one stop (slide) of the scroll journey, in lap order. */
export type StopId =
  | "grid"
  | "qualifying"
  | "rookie"
  | "design"
  | "throttle"
  | "present"
  | "live"
  | "garage"
  | "laptime"
  | "finish";

export type ProjectStatus = "live" | "in-development";

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly status: ProjectStatus;
  /** Only shown when it is known and confirmed. */
  readonly stack?: string;
  readonly summary: string;
  /**
   * A screenshot of the site, shown on its billboard (public path, about 16:10).
   * When the file is missing, the billboard shows a drawn browser frame instead.
   */
  readonly preview?: string;
  /** Add a live URL here and the card shows a link. */
  readonly url?: string;
}

export interface TimelineEntry {
  readonly years: string;
  readonly title: string;
  readonly place: string;
  readonly note: string;
}

export interface Meter {
  readonly label: string;
  /** Filled segments out of ten. */
  readonly value: number;
}

export interface Stat {
  readonly value: string;
  readonly label: string;
}

interface StopBase {
  readonly id: StopId;
  /** The slide's name, shown above the heading. */
  readonly eyebrow: string;
  /** A shorter form of the name for the HUD. */
  readonly short: string;
  readonly heading: string;
  readonly body: string;
}

export interface TextStop extends StopBase {
  readonly kind: "text";
}

export interface TimelineStop extends StopBase {
  readonly kind: "timeline";
  readonly entries: readonly TimelineEntry[];
}

export interface ChapterStop extends StopBase {
  readonly kind: "chapter";
  readonly role: string;
  readonly company: string;
  /** Company logo (public path). When the file is missing, a monogram of the company shows instead. */
  readonly logo?: string;
  readonly period: string;
  readonly bullets: readonly string[];
  readonly shift: string;
  readonly meters: readonly Meter[];
}

export interface ProjectsStop extends StopBase {
  readonly kind: "projects";
  readonly projects: readonly Project[];
}

export interface StatsStop extends StopBase {
  readonly kind: "stats";
  readonly stats: readonly Stat[];
}

export interface ContactStop extends StopBase {
  readonly kind: "contact";
  readonly email: string;
  readonly linkedinLabel: string;
  readonly linkedinUrl: string;
}

/** Discriminated union: narrow with `stop.kind`. */
export type Stop =
  | TextStop
  | TimelineStop
  | ChapterStop
  | ProjectsStop
  | StatsStop
  | ContactStop;

export interface SiteInfo {
  readonly name: string;
  readonly role: string;
  readonly location: string;
  readonly description: string;
}
