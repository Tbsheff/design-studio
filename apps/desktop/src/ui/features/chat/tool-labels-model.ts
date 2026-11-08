import { baseName } from "../../domain/format.js";
import { shortInput } from "./run-state-model.js";

const PATH_KEYS = ["file_path", "path", "filePath", "notebook_path"];

const humanize = (raw: string): string => {
  const words = raw
    .replaceAll(/[_-]+/gu, " ")
    .replaceAll(/([a-z])([A-Z])/gu, "$1 $2")
    .trim()
    .toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

const prettyToolName = (name: string): string => {
  const parts = name.split("__");

  if (parts[0] === "mcp" && parts.length >= 3) {
    return humanize(parts.slice(2).join(" "));
  }

  if (/^[a-z]/u.test(name) || name.includes("_")) {
    return humanize(name);
  }

  return name;
};

const isAbsolutePath = (value: string): boolean =>
  value.startsWith("/") ||
  /^[A-Za-z]:[\\/]/u.test(value) ||
  value.startsWith("~/");

const relativePath = (file: string, workTree: string | null): string => {
  const norm = file.replaceAll("\\", "/");
  const root = workTree?.replaceAll("\\", "/").replace(/\/+$/u, "");

  if (root && norm.startsWith(`${root}/`)) {
    return norm.slice(root.length + 1);
  }

  if (isAbsolutePath(norm)) {
    return baseName(norm);
  }

  return norm;
};

const pathInput = (input: unknown): string | null => {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;

  for (const key of PATH_KEYS) {
    const value = record[key];

    if (typeof value === "string" && value) {
      return value;
    }
  }

  return null;
};

const toolTarget = (input: unknown, workTree: string | null): string => {
  const file = pathInput(input);

  if (file) {
    return relativePath(file, workTree);
  }

  const raw = shortInput(input);

  if (isAbsolutePath(raw)) {
    return relativePath(raw, workTree);
  }

  return raw;
};

const SKILL_TOOL = "Skill";

const skillToolName = (input: unknown): string => {
  if (!input || typeof input !== "object") {
    return "";
  }

  const value = (input as Record<string, unknown>)["skill"];

  if (typeof value !== "string") {
    return "";
  }

  if (value.startsWith("personal:")) {
    return value.slice("personal:".length);
  }

  return value;
};

const toolLabel = (name: string, input: unknown): string => {
  if (name !== SKILL_TOOL) {
    return prettyToolName(name);
  }

  const skill = skillToolName(input);

  if (skill) {
    return `Skill · ${skill}`;
  }

  return "Skill";
};

const TOOL_VERBS: Record<string, string> = {
  Bash: "Run",
  Edit: "Edit",
  Glob: "Find",
  Grep: "Search",
  MultiEdit: "Edit",
  Read: "Read",
  Skill: "Skill",
  TodoWrite: "Update todos",
  WebFetch: "Fetch",
  Write: "Write",
  mcp__studio__define_tweaks: "Define tweaks",
  mcp__studio__design_review: "Design review",
  mcp__studio__design_system_check: "Design system check",
  mcp__studio__render_check: "Render check",
  mcp__studio__screenshot: "Screenshot",
};

const toolVerb = (name: string): string =>
  TOOL_VERBS[name] ?? prettyToolName(name);

const TOOL_GROUPS: Record<string, string> = {
  Bash: "Ran",
  Edit: "Edited",
  Glob: "Searched",
  Grep: "Searched",
  MultiEdit: "Edited",
  NotebookEdit: "Edited",
  Read: "Read",
  Skill: "Skill",
  TodoWrite: "Planned",
  WebFetch: "Fetched",
  WebSearch: "Searched",
  Write: "Wrote",
  mcp__studio__define_tweaks: "Tweaks",
  mcp__studio__design_review: "Checked",
  mcp__studio__design_system_check: "Checked",
  mcp__studio__render_check: "Checked",
  mcp__studio__screenshot: "Checked",
};

const toolGroupLabel = (name: string): string =>
  TOOL_GROUPS[name] ?? prettyToolName(name);

interface ToolTally {
  label: string;
  count: number;
}

const toolTally = (names: Iterable<string>): ToolTally[] => {
  const counts = new Map<string, number>();

  for (const name of names) {
    const label = toolGroupLabel(name);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts].map(([label, count]) => ({ count, label }));
};

const toolSubject = (
  name: string,
  input: unknown,
  workTree: string | null
): string => {
  if (name === SKILL_TOOL) {
    return skillToolName(input);
  }

  if (name === "TodoWrite") {
    return "";
  }

  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;

    if (typeof record["viewport"] === "string") {
      return record["viewport"];
    }

    if (name.startsWith("mcp__") && !pathInput(input)) {
      return "";
    }
  }

  return toolTarget(input, workTree);
};

export {
  SKILL_TOOL,
  prettyToolName,
  skillToolName,
  toolGroupLabel,
  toolLabel,
  toolSubject,
  toolTally,
  toolTarget,
  toolVerb,
};

export type { ToolTally };
