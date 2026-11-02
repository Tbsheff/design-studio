import path from "node:path";

import { CANVAS_DIR } from "../../../shared/canvas-file.js";
import { TOKENS_CSS_FILE } from "../../../shared/contracts.js";
import { TWEAKS_FILE, TWEAKS_TOOL } from "../../../shared/tweaks.js";
import {
  checkPathInside,
  realpathNearest,
  workTreeRoot,
} from "../paths/index.js";
import { isMissing, isText } from "./tool-input.js";
import type { ToolInput } from "./tool-input.js";
import {
  PATH_FIELDS,
  PATTERN_FIELDS,
  READ_ONLY_TOOLS,
  skillsOn,
} from "./tool-names.js";
import type { ToolPolicy } from "./tool-names.js";

const EXECUTED_CONFIG_PATTERNS = [
  /^vite\.config\./u,
  /^vitest\.config\./u,
  /^postcss\.config\./u,
  /^\.postcssrc/u,
  /^tailwind\.config\./u,
  /^babel\.config\./u,
  /^\.babelrc/u,
  /^package\.json$/u,
  /^\.npmrc$/u,
  /^\.yarnrc/u,
  /^\.pnpmfile\.c?js$/u,
  /^next\.config\./u,
  /^turbo\.json$/u,
  /^pnpm-workspace\.yaml$/u,
];

const SECRET_FILE_PATTERNS = [
  /^\.env$/u,
  /^\.env\.(?!example$|sample$|template$)/u,
  /\.(?:pem|key|p12|pfx|keystore|jks)$/u,
  /^id_(?:rsa|dsa|ecdsa|ed25519)/u,
  /^\.netrc$/u,
  /^credentials(?:\.json)?$/u,
];

const SECRET_MESSAGE =
  "Design Studio keeps secrets files (.env, keys, credentials) away from the agent. Ask the user to change it by hand.";

const GENERATED_TOKENS_MESSAGE =
  "tokens.css is generated from design-system/tokens.json; edit tokens.json instead";

const TWEAKS_FILE_MESSAGE = `${TWEAKS_FILE} is owned by the studio; change the controls with ${TWEAKS_TOOL} instead`;

const STUDIO_DIR_MESSAGE = `${CANVAS_DIR}/ is owned by the studio; change the canvas layout with mcp__studio__canvas_place instead`;

const toAbsolute = (root: string, raw: string): string => {
  if (path.isAbsolute(raw)) {
    return raw;
  }

  return path.resolve(root, raw);
};

const isInsideDir = (dir: string, raw: string): boolean => {
  if (!path.isAbsolute(raw)) {
    return false;
  }

  const relative = path.relative(
    realpathNearest(dir),
    realpathNearest(path.normalize(raw))
  );

  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const checkPattern = (raw: string): string | null => {
  if (path.isAbsolute(raw) || raw.startsWith("~")) {
    return `Pattern ${raw} must be relative to the work tree.`;
  }

  if (raw.split(/[\\/]/u).includes("..")) {
    return `Pattern ${raw} must not leave the work tree.`;
  }

  return null;
};

const isSecretFile = (file: string): boolean => {
  const name = path.basename(file).toLowerCase();

  return SECRET_FILE_PATTERNS.some((pattern) => pattern.test(name));
};

const isSecretPath = (workTree: string, value: string): boolean => {
  const absolute = toAbsolute(workTreeRoot(workTree), value);

  return isSecretFile(value) || isSecretFile(realpathNearest(absolute));
};

const checkSecretFiles = (
  workTree: string,
  input: ToolInput
): string | null => {
  for (const field of PATH_FIELDS) {
    const value = input[field];

    if (isText(value) && isSecretPath(workTree, value)) {
      return SECRET_MESSAGE;
    }
  }

  for (const field of PATTERN_FIELDS) {
    const value = input[field];

    if (isText(value) && /(?:^|\/)\.env(?:\.|$|\*)/u.test(value)) {
      return SECRET_MESSAGE;
    }
  }

  return null;
};

const isExecutedConfigFile = (file: string): boolean => {
  const name = path.basename(file).toLowerCase();

  return EXECUTED_CONFIG_PATTERNS.some((pattern) => pattern.test(name));
};

const isExecutedConfigPath = (workTree: string, value: string): boolean => {
  const absolute = toAbsolute(workTreeRoot(workTree), value);

  return (
    isExecutedConfigFile(value) ||
    isExecutedConfigFile(realpathNearest(absolute))
  );
};

const checkExecutedConfig = (
  workTree: string,
  input: ToolInput
): string | null => {
  for (const field of PATH_FIELDS) {
    const value = input[field];

    if (isText(value) && isExecutedConfigPath(workTree, value)) {
      return `Design Studio does not let the agent change ${path.basename(value)}: build tools run this file as code. Ask the user to change it by hand.`;
    }
  }

  return null;
};

const isGeneratedTokensFile = (workTree: string, raw: string): boolean => {
  const root = workTreeRoot(workTree);
  const absolute = toAbsolute(root, raw);

  const relative = path
    .relative(root, realpathNearest(path.normalize(absolute)))
    .split(path.sep)
    .join("/");

  return relative.toLowerCase() === TOKENS_CSS_FILE.toLowerCase();
};

const relativeToRoot = (workTree: string, raw: string): string => {
  const root = workTreeRoot(workTree);
  const absolute = toAbsolute(root, raw);

  return path
    .relative(root, realpathNearest(path.normalize(absolute)))
    .split(path.sep)
    .join("/")
    .toLowerCase();
};

const isTweaksFile = (workTree: string, raw: string): boolean =>
  relativeToRoot(workTree, raw) === TWEAKS_FILE.toLowerCase();

const isStudioDir = (workTree: string, raw: string): boolean => {
  const relative = relativeToRoot(workTree, raw);

  return relative === CANVAS_DIR || relative.startsWith(`${CANVAS_DIR}/`);
};

const readOnlyDirOf = (
  workTree: string,
  dirs: string[],
  value: string
): string | undefined => {
  const relative = relativeToRoot(workTree, value);

  return dirs.find((dir) => relative === dir || relative.startsWith(`${dir}/`));
};

const checkReadOnlyDirs = (
  policy: ToolPolicy,
  input: ToolInput
): string | null => {
  const dirs = (policy.readOnlyDirs ?? []).map((dir) => dir.toLowerCase());

  if (dirs.length === 0) {
    return null;
  }

  for (const field of PATH_FIELDS) {
    const value = input[field];
    const inside = isText(value) && readOnlyDirOf(policy.workTree, dirs, value);

    if (inside) {
      return `${inside}/ holds the untrusted source material of this design system. It is read only; change the design-system files instead.`;
    }
  }

  return null;
};

const checkGeneratedFile = (
  workTree: string,
  input: ToolInput
): string | null => {
  for (const field of PATH_FIELDS) {
    const value = input[field];

    if (isText(value) && isGeneratedTokensFile(workTree, value)) {
      return GENERATED_TOKENS_MESSAGE;
    }

    if (isText(value) && isTweaksFile(workTree, value)) {
      return TWEAKS_FILE_MESSAGE;
    }

    if (isText(value) && isStudioDir(workTree, value)) {
      return STUDIO_DIR_MESSAGE;
    }
  }

  return null;
};

const readableSkillDirs = (policy: ToolPolicy, toolName: string): string[] => {
  if (!READ_ONLY_TOOLS.has(toolName) || !skillsOn(policy)) {
    return [];
  }

  return policy.skillDirs ?? [];
};

const checkPathField = (
  workTree: string,
  skillDirs: string[],
  field: string,
  value: ToolInput[string]
): string | null => {
  if (isMissing(value)) {
    return null;
  }

  if (!isText(value)) {
    return `Field ${field} must be a string.`;
  }

  if (skillDirs.some((dir) => isInsideDir(dir, value))) {
    return null;
  }

  return checkPathInside(workTree, value);
};

const checkPathFields = (
  policy: ToolPolicy,
  toolName: string,
  input: ToolInput
): string | null => {
  const skillDirs = readableSkillDirs(policy, toolName);

  for (const field of PATH_FIELDS) {
    const problem = checkPathField(
      policy.workTree,
      skillDirs,
      field,
      input[field]
    );

    if (problem) {
      return problem;
    }
  }

  return null;
};

const checkPatternFields = (input: ToolInput): string | null => {
  for (const field of PATTERN_FIELDS) {
    const value = input[field];
    const problem = isText(value) && checkPattern(value);

    if (problem) {
      return problem;
    }
  }

  return null;
};

const checkPathTool = (
  policy: ToolPolicy,
  toolName: string,
  input: ToolInput
): string | null =>
  checkPathFields(policy, toolName, input) ?? checkPatternFields(input);

export {
  GENERATED_TOKENS_MESSAGE,
  SECRET_MESSAGE,
  STUDIO_DIR_MESSAGE,
  checkExecutedConfig,
  checkGeneratedFile,
  checkPathTool,
  checkReadOnlyDirs,
  checkSecretFiles,
  isExecutedConfigFile,
  isSecretFile,
};
