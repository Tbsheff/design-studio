import type { RunMode } from "@design-studio/contracts";

import { TWEAKS_TOOL } from "../../../shared/tweaks.js";
import type { IntegrationPolicy } from "./integration-tools.js";
import { toolCatalog } from "./tool-catalog.js";

interface ToolPolicy {
  workTree: string;
  mode: RunMode;
  allowBash: boolean;
  allowInstall: boolean;
  integrations?: IntegrationPolicy;
  skills?: string[];
  skillDirs?: string[];
  skillsOff?: string;
  readOnlyDirs?: string[];
  lockedPaths?: string[];
  plan?: boolean;
}

type ToolSet = Pick<ToolPolicy, "mode" | "allowBash" | "skills">;

const READ_TOOLS = ["Read", "Glob", "Grep"];
const READ_ONLY_TOOLS = new Set(READ_TOOLS);
const SKILL_TOOL = "Skill";
const TODO_TOOL = "TodoWrite";
const WRITE_TOOLS = ["Write", "Edit"];

const PATH_TOOLS = new Set([
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "Glob",
  "Grep",
]);

const PATH_FIELDS = ["file_path", "path", "notebook_path"] as const;
const PATTERN_FIELDS = ["pattern", "glob"] as const;

const WRITE_PATH_TOOLS = new Set([
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
]);

const PLAN_MODE_DENY =
  "Plan mode is on, so files stay as they are. Reply with the plan; the user approves it before the build.";

const skillsOn = (policy: Pick<ToolPolicy, "skills">): boolean =>
  (policy.skills?.length ?? 0) > 0;

const baseToolNames = (policy: ToolSet): string[] => {
  if (policy.mode !== "edit") {
    return [...READ_TOOLS, TODO_TOOL];
  }

  return [...READ_TOOLS, ...WRITE_TOOLS, TODO_TOOL];
};

const builtinToolNames = (policy: ToolSet): string[] => {
  const names = baseToolNames(policy);

  if (policy.allowBash && policy.mode === "edit") {
    names.push("Bash");
  }

  if (skillsOn(policy)) {
    names.push(SKILL_TOOL);
  }

  return names;
};

const permittedToolNames = (policy: ToolSet): string[] => [
  ...builtinToolNames(policy),
  ...toolCatalog().studioTools,
];

const blockedInCritique = (toolName: string): boolean =>
  toolName === TWEAKS_TOOL || toolCatalog().blockedTools.has(toolName);

const blockedInPlan = (toolName: string): boolean =>
  WRITE_PATH_TOOLS.has(toolName) ||
  toolName === "Bash" ||
  blockedInCritique(toolName);

export {
  PATH_FIELDS,
  PATH_TOOLS,
  PATTERN_FIELDS,
  PLAN_MODE_DENY,
  READ_ONLY_TOOLS,
  READ_TOOLS,
  SKILL_TOOL,
  TODO_TOOL,
  WRITE_PATH_TOOLS,
  blockedInCritique,
  blockedInPlan,
  builtinToolNames,
  permittedToolNames,
  skillsOn,
};

export type { ToolPolicy, ToolSet };
