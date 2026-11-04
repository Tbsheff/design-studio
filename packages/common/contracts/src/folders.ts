import type { Project } from "@design-studio/contracts";
import { withoutAnswers } from "@design-studio/contracts/clarify";

const SLUG_MAX_LENGTH = 48;
const SLUG_FALLBACK = "untitled";
export const MAX_SLUG_SUFFIX = 999;

export function nameFromPrompt(prompt: string): string {
  const words = withoutAnswers(prompt)
    .replaceAll(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ");

  return words.length > 48 ? `${words.slice(0, 47)}…` : words || "Untitled";
}

export function slugify(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replaceAll(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  const cut = ascii.slice(0, SLUG_MAX_LENGTH).replaceAll(/-+$/g, "");

  return cut || SLUG_FALLBACK;
}

export function slugCandidate(slug: string, attempt: number): string {
  return attempt <= 1 ? slug : `${slug}-${attempt}`;
}

export function isInsideFolder(target: string, folder: string): boolean {
  const base = folder.replace(/\/+$/, "");

  return target === base || target.startsWith(`${base}/`);
}

function projectFolder(project: Project): string | null {
  return project.imported?.sourcePath ?? null;
}

export function projectsInFolder(
  projects: Project[],
  folder: string
): Project[] {
  return projects.filter((project) => {
    const source = projectFolder(project);

    return source !== null && isInsideFolder(source, folder);
  });
}

export function shortenHome(target: string, homeDir: string | null): string {
  if (!homeDir) {
    return target;
  }

  const home = homeDir.replace(/\/+$/, "");

  if (target === home) {
    return "~";
  }

  return target.startsWith(`${home}/`)
    ? `~${target.slice(home.length)}`
    : target;
}

export interface WorkspaceFolder {
  id: string;
  path: string;
  label: string;
  addedAt: number;
  missing: boolean;
  default?: boolean;
}

export interface WorkspaceList {
  homeDir: string;
  folders: WorkspaceFolder[];
}
