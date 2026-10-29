import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { Project, RunRequest, SelectionContext, SourceLoc } from '../../shared/contracts.js';
import type { ResolvedRunConfig } from '../../shared/run-levels.js';
import { loadAppTokens } from '../design-system/app-tokens/source.js';
import type { AppToken } from '../design-system/app-tokens/tokens.js';
import { dropSecretLines, loadRepoContextOutline } from './repo-context.js';

export const LEAN_MAX_TURNS = 6;
const LEAN_PROMPT_MAX_CHARS = 300;
const SLICE_LINES = 80;
const MAX_TOKENS = 40;
const MAX_VALUE_CHARS = 60;

type LeanRequest = Pick<RunRequest, 'lean' | 'prompt' | 'selection' | 'attachmentIds' | 'task' | 'plan' | 'variation'>;

export function isLeanRun(request: LeanRequest): boolean {
  if (request.lean === true) return true;
  if (request.task || request.plan || request.variation) return false;
  return (request.selection?.length ?? 0) === 1 && (request.attachmentIds?.length ?? 0) === 0 && request.prompt.trim().length < LEAN_PROMPT_MAX_CHARS;
}

export function leanRunConfig(config: ResolvedRunConfig): ResolvedRunConfig {
  const preset = config.preset;
  return {
    ...config,
    maxTurns: Math.min(LEAN_MAX_TURNS, config.maxTurns),
    criticModel: null,
    preset: { ...preset, skills: false, checks: { ...preset.checks, critic: false }, criticMaxCalls: 0, quickCritic: false, regressionCheck: false },
  };
}

export const LEAN_RUN_BLOCK = `<run-level>
Level: LEAN EDIT. A small change to the selected element, in at most ${LEAN_MAX_TURNS} turns.
- <lean_context> has the source lines around the element and the tokens it uses. Read more of the file only when those lines are not enough.
- Change only what the request asks. Use the listed tokens, no raw colors.
- Do not call TodoWrite, Skill, design_review or review_frame, and do not write a design brief.
- After your edit, call mcp__studio__render_check once.
- Final reply: one or two sentences, then any finding you did not fix.
</run-level>`;

const LOC_ATTR = /data-studio-loc="([^"]+):(\d+):(\d+)"/;

function sourceOf(element: SelectionContext): SourceLoc | null {
  if (element.source) return element.source;
  const match = LOC_ATTR.exec(element.outerHTML);
  if (!match?.[1]) return null;
  return { file: match[1], line: Number(match[2]), col: Number(match[3]) };
}

async function readInside(workTree: string, file: string): Promise<string | null> {
  const root = await realpath(workTree).catch(() => null);
  const real = root ? await realpath(path.resolve(root, file)).catch(() => null) : null;
  if (!root || !real) return null;
  const rel = path.relative(root, real);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return readFile(real, 'utf8').catch(() => null);
}

interface Slice {
  file: string;
  from: number;
  to: number;
  text: string;
}

function sliceAround(text: string, file: string, line: number): Slice {
  const lines = text.split('\n');
  const from = Math.max(1, Math.min(line - SLICE_LINES / 2, lines.length - SLICE_LINES + 1));
  const to = Math.min(lines.length, from + SLICE_LINES - 1);
  const body = lines.slice(from - 1, to).map((value, index) => `${String(from + index).padStart(5)}  ${value}`);
  return { file, from, to, text: dropSecretLines(body.join('\n')).text };
}

function classCores(text: string): Set<string> {
  const cores = new Set<string>();
  for (const match of text.matchAll(/class(?:Name)?=\{?["'`]([^"'`]+)["'`]/g)) {
    for (const name of (match[1] ?? '').split(/\s+/)) {
      const core = (name.split(':').pop() ?? '').replace(/^[!-]+/, '').replace(/\/[\w.[\]]+$/, '');
      if (core) cores.add(core);
    }
  }
  return cores;
}

const UTILITY_PREFIX: Record<string, RegExp> = {
  color: /^(?:text|bg|border(?:-[trblxyse])?|from|via|to|fill|stroke|ring|ring-offset|outline|decoration|shadow|divide|accent|caret|placeholder)-/,
  radius: /^rounded(?:-[trblse]{1,2})?-/,
  shadow: /^(?:shadow|drop-shadow)-/,
  font: /^font-/,
  text: /^text-/,
  tracking: /^tracking-/,
  leading: /^leading-/,
};

function usesToken(token: AppToken, cores: Set<string>, text: string): boolean {
  if (text.includes(`var(${token.name})`)) return true;
  const match = /^--([a-z]+)-(.+)$/.exec(token.name);
  const prefix = match?.[1] ? UTILITY_PREFIX[match[1]] : undefined;
  if (!prefix || !match?.[2]) return false;
  for (const core of cores) if (prefix.test(core) && core.replace(prefix, '') === match[2]) return true;
  return false;
}

function tokenLine(token: AppToken): string {
  const value = token.value.length > MAX_VALUE_CHARS ? `${token.value.slice(0, MAX_VALUE_CHARS)}…` : token.value;
  const dark = token.darkValue && token.darkValue !== token.value ? ` (dark ${token.darkValue.slice(0, MAX_VALUE_CHARS)})` : '';
  return `${token.name}: ${value}${dark}`;
}

async function tokenBlock(workTree: string, text: string): Promise<string | null> {
  const loaded = await loadAppTokens(workTree).catch(() => null);
  if (!loaded) return null;
  const cores = classCores(text);
  const used = loaded.tokens.filter((token) => usesToken(token, cores, text)).slice(0, MAX_TOKENS);
  if (used.length === 0) return null;
  return `<tokens file="${loaded.file}">\n${used.map(tokenLine).join('\n')}\n</tokens>`;
}

export async function leanContext(project: Pick<Project, 'app'>, workTree: string, selection: readonly SelectionContext[] | undefined): Promise<string | null> {
  const element = selection?.[0];
  const loc = element ? sourceOf(element) : null;
  const source = loc ? await readInside(workTree, loc.file) : null;
  const slice = loc && source !== null ? sliceAround(source, loc.file, loc.line) : null;
  const tokens = await tokenBlock(workTree, [element?.outerHTML ?? '', slice?.text ?? ''].join('\n'));
  const titles = await loadRepoContextOutline(project, workTree).catch(() => null);
  const parts = [
    slice ? `<source path="${slice.file}" lines="${slice.from}-${slice.to}">\n${slice.text}\n</source>` : null,
    tokens,
    titles ? `<repo_titles>\nSection titles of the repo agent files. Read a file only when the change needs that section.\n${titles}\n</repo_titles>` : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return null;
  return `<lean_context>\nThis is a lean run: the studio sent only the code around the selected element, the tokens it uses and the titles of the repo agent files. Follow the repo conventions in that code.\n\n${parts.join('\n\n')}\n</lean_context>`;
}
