import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";

import { checkBash } from "./bash-checks.js";
import { toIntegrationAccess } from "./integration-tools.js";
import type { IntegrationAccess } from "./integration-tools.js";
import {
  checkExecutedConfig,
  checkGeneratedFile,
  checkPathTool,
  checkReadOnlyDirs,
  checkSecretFiles,
} from "./path-checks.js";
import { isText } from "./tool-input.js";
import type { ToolInput } from "./tool-input.js";
import {
  PATH_TOOLS,
  PLAN_MODE_DENY,
  SKILL_TOOL,
  WRITE_PATH_TOOLS,
  blockedInCritique,
  blockedInPlan,
  permittedToolNames,
} from "./tool-names.js";
import type { ToolPolicy } from "./tool-names.js";

const deny = (message: string): PermissionResult => ({
  behavior: "deny",
  message,
});

const checkSkill = (policy: ToolPolicy, input: ToolInput): string | null => {
  if (policy.skillsOff) {
    return policy.skillsOff;
  }

  const requested = input["skill"];

  if (!isText(requested)) {
    return null;
  }

  const enabled = policy.skills ?? [];

  const known = enabled.some(
    (name) => name === requested || name.endsWith(`:${requested}`)
  );

  if (known) {
    return null;
  }

  return `Skill ${requested} is not turned on for this project.`;
};

const checkFileTool = (
  policy: ToolPolicy,
  toolName: string,
  input: ToolInput
): string | null => {
  if (PATH_TOOLS.has(toolName)) {
    const problem =
      checkPathTool(policy, toolName, input) ??
      checkSecretFiles(policy.workTree, input);

    if (problem) {
      return problem;
    }
  }

  if (WRITE_PATH_TOOLS.has(toolName)) {
    return (
      checkExecutedConfig(policy.workTree, input) ??
      checkGeneratedFile(policy.workTree, input) ??
      checkReadOnlyDirs(policy, input)
    );
  }

  return null;
};

const toIntegrationProblem = (
  policy: ToolPolicy,
  access: IntegrationAccess,
  toolName: string
): string | null => {
  if (policy.mode === "critique") {
    return `${toolName} is not available in critique runs.`;
  }

  if (policy.plan && access === "ask") {
    return PLAN_MODE_DENY;
  }

  return null;
};

const findToolProblem = (
  policy: ToolPolicy,
  toolName: string,
  input: ToolInput
): string | null => {
  const outside = toIntegrationAccess(policy, toolName);

  if (outside !== null) {
    return toIntegrationProblem(policy, outside, toolName);
  }

  if (!permittedToolNames(policy).includes(toolName)) {
    return `Tool ${toolName} is not available in Design Studio.`;
  }

  if (policy.plan && blockedInPlan(toolName)) {
    return PLAN_MODE_DENY;
  }

  const fileProblem = checkFileTool(policy, toolName, input);

  if (fileProblem) {
    return fileProblem;
  }

  if (policy.mode !== "edit" && blockedInCritique(toolName)) {
    return `${toolName.replace("mcp__studio__", "")} is not available in ${policy.mode} runs.`;
  }

  if (toolName === "Bash") {
    return checkBash(policy, input);
  }

  if (toolName === SKILL_TOOL) {
    return checkSkill(policy, input);
  }

  return null;
};

const evaluateToolUse = (
  policy: ToolPolicy,
  toolName: string,
  input: ToolInput
): PermissionResult => {
  const problem = findToolProblem(policy, toolName, input);

  if (problem !== null) {
    return deny(problem);
  }

  return { behavior: "allow", updatedInput: input };
};

export { bashWriteProblem, isInstallCommand } from "./bash-checks.js";

export {
  GENERATED_TOKENS_MESSAGE,
  STUDIO_DIR_MESSAGE,
  isExecutedConfigFile,
  isSecretFile,
} from "./path-checks.js";

export { toIntegrationAccess, toIntegrationName } from "./integration-tools.js";

export type {
  IntegrationAccess,
  IntegrationGate,
  IntegrationPolicy,
} from "./integration-tools.js";

export { setToolCatalog } from "./tool-catalog.js";

export type { ToolCatalog } from "./tool-catalog.js";

export type { ToolInput } from "./tool-input.js";

export {
  PLAN_MODE_DENY,
  READ_TOOLS,
  SKILL_TOOL,
  TODO_TOOL,
  TOOL_SEARCH_TOOL,
  blockedInCritique,
  builtinToolNames,
  permittedToolNames,
} from "./tool-names.js";

export type { ToolPolicy } from "./tool-names.js";

export { evaluateToolUse };
