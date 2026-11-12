/** Identifies one stop (chapter) of the scroll journey. */
export type StopId =
  | "grid"
  | "about"
  | "climb"
  | "design"
  | "speed"
  | "engineering"
  | "projects"
  | "toolbox"
  | "contact";

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly domain: string;
  readonly summary: string;
  readonly role: string;
}

export interface SkillGroup {
  readonly label: string;
  readonly items: readonly string[];
}

interface StopBase {
  readonly id: StopId;
  /** Short label shown above the heading and in the HUD. */
  readonly eyebrow: string;
  readonly heading: string;
  readonly body: string;
}

export interface TextStop extends StopBase {
  readonly kind: "text";
}

export interface SkillsStop extends StopBase {
  readonly kind: "skills";
  readonly groups: readonly SkillGroup[];
}

export interface ProjectsStop extends StopBase {
  readonly kind: "projects";
  readonly projects: readonly Project[];
}

export interface ContactStop extends StopBase {
  readonly kind: "contact";
  readonly email: string;
  readonly linkedinLabel: string;
  readonly linkedinUrl: string;
}

/** Discriminated union: narrow with `stop.kind`. */
export type Stop = TextStop | SkillsStop | ProjectsStop | ContactStop;

export interface SiteInfo {
  readonly name: string;
  readonly role: string;
  readonly location: string;
  readonly description: string;
}
