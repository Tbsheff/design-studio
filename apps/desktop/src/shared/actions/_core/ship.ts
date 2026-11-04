import { slugify } from "./folders.js";

export type ShipMode = "branch" | "push" | "pr";

export const SHIP_MODES: readonly ShipMode[] = ["branch", "push", "pr"];

export interface ShipSettings {
  user: string;
  branchTemplate: string;
  bodyTemplate: string;
  issueId: string;
}

export const DEFAULT_SHIP_SETTINGS: ShipSettings = {
  bodyTemplate: "{summary}\n\n### Studio versions\n{versions}\n\nFixes {ISSUE}",
  branchTemplate: "{user}/{issue}-{slug}",
  issueId: "",
  user: "",
};

export const SHIP_TEXT_MAX = {
  body: 20_000,
  bodyTemplate: 4000,
  branch: 200,
  branchTemplate: 200,
  commitMessage: 4000,
  issueId: 40,
  title: 200,
  user: 40,
};

export interface ShipRecord {
  versionId: string;
  baseVersionId: string;
  branch: string;
  sha: string;
  mode: ShipMode;
  pushed: boolean;
  prUrl: string | null;
  files: number;
  at: number;
}

export interface ShipRepoInfo {
  root: string;
  prefix: string;
  branch: string | null;
  head: string;
  remote: string | null;
  remoteUrl: string | null;
  github: boolean;
  gh: boolean;
}

export type ShipBaseKind = "attached" | "last-ship" | "version";

export interface ShipBaseOption {
  versionId: string;
  title: string;
  at: number;
  kind: ShipBaseKind;
}

export type ShipFileStatus = "added" | "modified" | "deleted";

export interface ShipFile {
  path: string;
  status: ShipFileStatus;
  additions: number | null;
  deletions: number | null;
  diff: string;
  diffCut: boolean;
  refused: string | null;
  conflict: string | null;
}

export interface ShipDefaults {
  branch: string;
  title: string;
  commitMessage: string;
  body: string;
}

export type ShipFormatTool = "biome" | "prettier";

export interface ShipFormat {
  tool: ShipFormatTool | null;
  command: string | null;
  skipped: string[];
  note: string;
}

export interface ShipFormatResult {
  tool: ShipFormatTool | null;
  formatted: { path: string; diff: string }[];
  errors: { path: string; message: string }[];
  skipped: string[];
  note: string;
}

export interface ShipPrepare {
  projectId: string;
  repo: ShipRepoInfo | null;
  blocked: string | null;
  base: ShipBaseOption | null;
  bases: ShipBaseOption[];
  headVersionId: string | null;
  files: ShipFile[];
  versions: { id: string; title: string }[];
  summary: string;
  settings: ShipSettings;
  defaults: ShipDefaults;
  vars: ShipTemplateVars;
  history: ShipRecord[];
  format?: ShipFormat;
}

export interface ShipRequest {
  baseVersionId: string;
  headVersionId: string;
  files: string[];
  branch: string;
  commitMessage: string;
  title: string;
  body: string;
  mode: ShipMode;
  client?: string;
}

export interface ShipResult {
  branch: string;
  sha: string;
  mode: ShipMode;
  pushed: boolean;
  remote: string | null;
  prUrl: string | null;
  prError: string | null;
  files: string[];
  format?: ShipFormatResult;
}

export interface ShipTemplateVars {
  user: string;
  issue: string;
  title: string;
  summary: string;
  versions: string[];
  files: string[];
}

const PLACEHOLDER = /\{(user|slug|issue|ISSUE|title|summary|versions|files)\}/g;

function values(vars: ShipTemplateVars): Record<string, string> {
  return {
    ISSUE: vars.issue.trim(),
    files: vars.files.map((file) => `- \`${file}\``).join("\n"),
    issue: vars.issue.trim().toLowerCase(),
    slug: vars.title.trim()
      ? slugify(vars.title).slice(0, 40).replace(/-+$/, "")
      : "",
    summary: vars.summary.trim(),
    title: vars.title.trim(),
    user: vars.user,
    versions: vars.versions.map((title) => `- ${title}`).join("\n"),
  };
}

export function renderShipTemplate(
  template: string,
  vars: ShipTemplateVars
): string {
  const table = values(vars);

  const lines = template.split("\n").flatMap((line) => {
    const names = [...line.matchAll(PLACEHOLDER)].map(
      (match) => match[1] ?? ""
    );

    if (names.length > 0 && names.every((name) => (table[name] ?? "") === "")) {
      return [];
    }

    return [
      line.replaceAll(PLACEHOLDER, (_all, name: string) => table[name] ?? ""),
    ];
  });

  return lines
    .join("\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanBranchName(raw: string): string {
  return raw
    .toLowerCase()
    .replaceAll(/[^a-z0-9/._-]+/g, "-")
    .split("/")
    .map((part) =>
      part
        .replaceAll(/\.{2,}/g, ".")
        .replaceAll(/^[-.]+|[-.]+$/g, "")
        .replace(/\.lock$/, "")
    )
    .filter(Boolean)
    .join("/")
    .slice(0, 120)
    .replace(/[/.-]+$/, "");
}

export function renderBranchName(
  template: string,
  vars: ShipTemplateVars
): string {
  return cleanBranchName(
    renderShipTemplate(template, vars).split("\n")[0] ?? ""
  );
}

const SECRET_NAMES = new Set([
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
  ".npmrc",
  ".netrc",
  ".pypirc",
  ".htpasswd",
  "credentials.json",
  "service-account.json",
  ".git-credentials",
]);

const SECRET_EXTENSIONS = [
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".keystore",
  ".jks",
  ".secret",
  ".asc",
  ".gpg",
];

export function refusedPath(file: string): string | null {
  const parts = file.split("/");
  const name = (parts.at(-1) ?? "").toLowerCase();

  if (parts.some((part) => part === "node_modules")) {
    return "node_modules is never committed.";
  }

  if (parts.some((part) => part === ".git")) {
    return ".git is never committed.";
  }

  if (name.startsWith(".env")) {
    return "Environment files (.env*) are never committed.";
  }

  if (
    SECRET_NAMES.has(name) ||
    name.startsWith("id_rsa") ||
    /^secrets?\./.test(name)
  ) {
    return "This looks like a secret or credentials file.";
  }

  if (SECRET_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Key and certificate files are never committed.";
  }

  return null;
}

export const PRIVATE_KEY_PATTERN = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;
