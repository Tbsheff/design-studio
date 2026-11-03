export type ProjectType = "next" | "vite" | "html" | "react" | "design-system";

export type HealthLevel = "ok" | "busy" | "warn" | "failed" | "off";

export interface ProjectHealth {
  level: HealthLevel;
  note: string;
}

export interface ProjectHit {
  id: string;
  name: string;
  type: ProjectType;
  typeLabel: string;
  place: string | null;
  updatedAt: number;
  openedAt: number | null;
  health: ProjectHealth | null;
  thumbnail: string | null;
}

export interface RouteHit {
  projectId: string;
  projectName: string;
  route: string;
  file: string;
  dynamic: boolean;
}

export interface ProjectSearchResult {
  query: string;
  projects: ProjectHit[];
  routes: RouteHit[];
}

export const TYPE_LABELS: Record<ProjectType, string> = {
  "design-system": "System",
  html: "Prototype · HTML",
  next: "App · Next.js",
  react: "Prototype · React",
  vite: "App · Vite",
};

interface TypedProject {
  kind: "html" | "react";
  designSystemFor?: string | null;
  app?: { framework: "next" | "vite" } | null;
  imported?: { created?: boolean } | null;
}

export function projectTypeOf(project: TypedProject): ProjectType {
  if (project.designSystemFor) {
    return "design-system";
  }

  if (project.app) {
    return project.app.framework;
  }

  const folder = Boolean(project.imported && !project.imported.created);

  return folder && project.kind === "react" ? "vite" : project.kind;
}
