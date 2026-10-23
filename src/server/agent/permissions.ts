import { realpathSync } from 'node:fs';
import path from 'node:path';
import type { CanUseTool, HookCallback, PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import { TOKENS_CSS_FILE } from '../../shared/contracts.js';
import type { RunMode } from '../../shared/contracts.js';
import { TWEAKS_FILE, TWEAKS_TOOL } from '../../shared/tweaks.js';

const STUDIO_MCP_TOOLS = ['mcp__studio__screenshot', 'mcp__studio__render_check', 'mcp__studio__design_review', 'mcp__studio__define_tweaks'] as const;

const READ_TOOLS = ['Read', 'Glob', 'Grep'];
const READ_ONLY_TOOLS = new Set(READ_TOOLS);
const SKILL_TOOL = 'Skill';
const WRITE_TOOLS = ['Write', 'Edit'];
const PATH_TOOLS = new Set(['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Glob', 'Grep']);
const PATH_FIELDS = ['file_path', 'path', 'notebook_path'] as const;
const PATTERN_FIELDS = ['pattern', 'glob'] as const;
const BLOCKED_SEGMENTS = new Set(['.git', 'node_modules']);
const WRITE_PATH_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const PACKAGE_TOOLS = new Set([
  'npm', 'npx', 'pnpm', 'pnpx', 'yarn', 'bun', 'bunx', 'pip', 'pip3', 'uv', 'brew', 'cargo', 'gem', 'corepack',
]);
const GO_INSTALL_VERBS = new Set(['get', 'install']);
const INLINE_CODE_PATTERNS = [
  /\b(sh|bash|zsh|dash)\s+(-\w*\s+)*-\w*c\b/,
  /(^|[^\w-])eval(\s|$)/,
  /\bnode\s+(-\S+\s+)*(-e|--eval|-p|--print)\b/,
  /\bpython[0-9.]*\s+(-\S+\s+)*-c\b/,
];
const EXECUTED_CONFIG_PATTERNS = [
  /^vite\.config\./,
  /^vitest\.config\./,
  /^postcss\.config\./,
  /^\.postcssrc/,
  /^tailwind\.config\./,
  /^babel\.config\./,
  /^\.babelrc/,
  /^package\.json$/,
  /^\.npmrc$/,
  /^\.yarnrc/,
  /^\.pnpmfile\.c?js$/,
];

export interface ToolPolicy {
  workTree: string;
  mode: RunMode;
  allowBash: boolean;
  allowInstall: boolean;
  skills?: string[];
  skillDirs?: string[];
  skillsOff?: string;
}

type ToolSet = Pick<ToolPolicy, 'mode' | 'allowBash' | 'skills'>;

function skillsOn(policy: Pick<ToolPolicy, 'skills'>): boolean {
  return (policy.skills?.length ?? 0) > 0;
}

export function builtinToolNames(policy: ToolSet): string[] {
  const names = policy.mode === 'critique' ? [...READ_TOOLS] : [...READ_TOOLS, ...WRITE_TOOLS];
  if (policy.allowBash && policy.mode !== 'critique') names.push('Bash');
  if (skillsOn(policy)) names.push(SKILL_TOOL);
  return names;
}

export function permittedToolNames(policy: ToolSet): string[] {
  return [...builtinToolNames(policy), ...STUDIO_MCP_TOOLS];
}

function realpathNearest(target: string): string {
  const remainder: string[] = [];
  let current = target;
  for (;;) {
    try {
      const real = realpathSync(current);
      return remainder.length ? path.join(real, ...remainder.reverse()) : real;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return target;
      remainder.push(path.basename(current));
      current = parent;
    }
  }
}

function workTreeRoot(workTree: string): string {
  return realpathNearest(path.resolve(workTree));
}

export function checkPathInside(workTree: string, raw: string): string | null {
  if (raw.startsWith('~')) return `Path ${raw} is outside the work tree.`;
  const root = workTreeRoot(workTree);
  const absolute = path.isAbsolute(raw) ? raw : path.resolve(root, raw);
  const real = realpathNearest(path.normalize(absolute));
  const relative = path.relative(root, real);
  if (relative === '') return null;
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return `Path ${raw} is outside the work tree.`;
  }
  const segments = relative.split(path.sep);
  const blocked = segments.find((segment) => BLOCKED_SEGMENTS.has(segment));
  if (blocked) return `Path ${raw} is inside ${blocked}, which is off limits.`;
  return null;
}

function isInsideDir(dir: string, raw: string): boolean {
  if (!path.isAbsolute(raw)) return false;
  const relative = path.relative(realpathNearest(dir), realpathNearest(path.normalize(raw)));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function checkPattern(raw: string): string | null {
  if (path.isAbsolute(raw) || raw.startsWith('~')) return `Pattern ${raw} must be relative to the work tree.`;
  if (raw.split(/[\\/]/).includes('..')) return `Pattern ${raw} must not leave the work tree.`;
  return null;
}

function commandTokens(command: string): string[] {
  return command
    .split(/[\s;&|()`$"'<>{}]+/)
    .filter((token) => token !== '')
    .map((token) => path.basename(token).toLowerCase());
}

function hasGoInstall(tokens: string[]): boolean {
  return tokens.some((token, index) => token === 'go' && GO_INSTALL_VERBS.has(tokens[index + 1] ?? ''));
}

export function isInstallCommand(command: string): boolean {
  if (INLINE_CODE_PATTERNS.some((pattern) => pattern.test(command))) return true;
  const tokens = commandTokens(command);
  if (tokens.some((token) => PACKAGE_TOOLS.has(token) || token === 'curl' || token === 'wget')) return true;
  return hasGoInstall(tokens);
}

function isExecutedConfigFile(file: string): boolean {
  const name = path.basename(file).toLowerCase();
  return EXECUTED_CONFIG_PATTERNS.some((pattern) => pattern.test(name));
}

function checkExecutedConfig(workTree: string, input: Record<string, unknown>): string | null {
  for (const field of PATH_FIELDS) {
    const value = input[field];
    if (typeof value !== 'string') continue;
    const absolute = path.isAbsolute(value) ? value : path.resolve(workTreeRoot(workTree), value);
    if (isExecutedConfigFile(value) || isExecutedConfigFile(realpathNearest(absolute))) {
      return `Design Studio does not let the agent change ${path.basename(value)}: build tools run this file as code. Ask the user to change it by hand.`;
    }
  }
  return null;
}

export const GENERATED_TOKENS_MESSAGE = 'tokens.css is generated from design-system/tokens.json; edit tokens.json instead';

function isGeneratedTokensFile(workTree: string, raw: string): boolean {
  const root = workTreeRoot(workTree);
  const absolute = path.isAbsolute(raw) ? raw : path.resolve(root, raw);
  const relative = path.relative(root, realpathNearest(path.normalize(absolute))).split(path.sep).join('/');
  return relative.toLowerCase() === TOKENS_CSS_FILE.toLowerCase();
}

const TWEAKS_FILE_MESSAGE = `${TWEAKS_FILE} is owned by the studio; change the controls with ${TWEAKS_TOOL} instead`;

function relativeToRoot(workTree: string, raw: string): string {
  const root = workTreeRoot(workTree);
  const absolute = path.isAbsolute(raw) ? raw : path.resolve(root, raw);
  return path.relative(root, realpathNearest(path.normalize(absolute))).split(path.sep).join('/').toLowerCase();
}

function isTweaksFile(workTree: string, raw: string): boolean {
  return relativeToRoot(workTree, raw) === TWEAKS_FILE.toLowerCase();
}

function checkGeneratedFile(workTree: string, input: Record<string, unknown>): string | null {
  for (const field of PATH_FIELDS) {
    const value = input[field];
    if (typeof value === 'string' && isGeneratedTokensFile(workTree, value)) return GENERATED_TOKENS_MESSAGE;
    if (typeof value === 'string' && isTweaksFile(workTree, value)) return TWEAKS_FILE_MESSAGE;
  }
  return null;
}

function deny(message: string): PermissionResult {
  return { behavior: 'deny', message };
}

function readableSkillDirs(policy: ToolPolicy, toolName: string): string[] {
  if (!READ_ONLY_TOOLS.has(toolName) || !skillsOn(policy)) return [];
  return policy.skillDirs ?? [];
}

function checkPathFields(policy: ToolPolicy, toolName: string, input: Record<string, unknown>): string | null {
  const skillDirs = readableSkillDirs(policy, toolName);
  for (const field of PATH_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') return `Field ${field} must be a string.`;
    if (skillDirs.some((dir) => isInsideDir(dir, value))) continue;
    const problem = checkPathInside(policy.workTree, value);
    if (problem) return problem;
  }
  return null;
}

function checkPatternFields(input: Record<string, unknown>): string | null {
  for (const field of PATTERN_FIELDS) {
    const value = input[field];
    if (typeof value !== 'string') continue;
    const problem = checkPattern(value);
    if (problem) return problem;
  }
  return null;
}

function checkPathTool(policy: ToolPolicy, toolName: string, input: Record<string, unknown>): string | null {
  return checkPathFields(policy, toolName, input) ?? checkPatternFields(input);
}

function checkSkill(policy: ToolPolicy, input: Record<string, unknown>): string | null {
  if (policy.skillsOff) return policy.skillsOff;
  const requested = input['skill'];
  if (typeof requested !== 'string') return null;
  const enabled = policy.skills ?? [];
  const known = enabled.some((name) => name === requested || name.endsWith(`:${requested}`));
  return known ? null : `Skill ${requested} is not turned on for this project.`;
}

function checkBash(policy: ToolPolicy, input: Record<string, unknown>): string | null {
  const command = input['command'];
  if (typeof command !== 'string') return 'Bash needs a command string.';
  if (!policy.allowInstall && isInstallCommand(command)) {
    return 'Package managers, downloads and inline code (sh -c, eval, node -e, python -c) are turned off for this project.';
  }
  return null;
}

function findToolProblem(policy: ToolPolicy, toolName: string, input: Record<string, unknown>): string | null {
  if (!permittedToolNames(policy).includes(toolName)) return `Tool ${toolName} is not available in Design Studio.`;
  if (PATH_TOOLS.has(toolName)) {
    const problem = checkPathTool(policy, toolName, input);
    if (problem) return problem;
  }
  if (WRITE_PATH_TOOLS.has(toolName)) {
    const problem = checkExecutedConfig(policy.workTree, input) ?? checkGeneratedFile(policy.workTree, input);
    if (problem) return problem;
  }
  if (toolName === TWEAKS_TOOL && policy.mode === 'critique') return 'define_tweaks is not available in critique runs.';
  if (toolName === 'Bash') return checkBash(policy, input);
  if (toolName === SKILL_TOOL) return checkSkill(policy, input);
  return null;
}

export function evaluateToolUse(policy: ToolPolicy, toolName: string, input: Record<string, unknown>): PermissionResult {
  const problem = findToolProblem(policy, toolName, input);
  if (problem !== null) return deny(problem);
  return { behavior: 'allow', updatedInput: input };
}

export function createCanUseTool(policy: ToolPolicy, onDecision?: (toolName: string, result: PermissionResult) => void): CanUseTool {
  return async (toolName, input) => {
    const result = evaluateToolUse(policy, toolName, input);
    onDecision?.(toolName, result);
    return result;
  };
}

const NO_CHANGE_TOOLS = new Set([...READ_TOOLS, SKILL_TOOL, 'mcp__studio__screenshot', 'mcp__studio__render_check', 'mcp__studio__design_review']);

export function canChangePreview(toolName: string): boolean {
  return !NO_CHANGE_TOOLS.has(toolName);
}

export function createPreToolUseGuard(
  policy: ToolPolicy,
  onDecision?: (toolName: string, result: PermissionResult) => void,
  beforeChange?: () => Promise<void>,
): HookCallback {
  return async (hookInput) => {
    if (hookInput.hook_event_name !== 'PreToolUse') return {};
    const toolInput = hookInput.tool_input;
    const record = toolInput && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {};
    const result = evaluateToolUse(policy, hookInput.tool_name, record);
    onDecision?.(hookInput.tool_name, result);
    if (result.behavior === 'allow') {
      if (beforeChange && canChangePreview(hookInput.tool_name)) await beforeChange();
      return {};
    }
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: result.message,
      },
    };
  };
}
