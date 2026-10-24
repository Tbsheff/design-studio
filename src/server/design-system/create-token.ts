import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseColor } from 'culori';
import { z } from 'zod';
import { TOKEN_NAME_PATTERN, TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type {
  CreateTokenRequest,
  CreateTokenResult,
  DesignToken,
  DirectEditRequest,
  Direction,
  Project,
  TokenGroupName,
  Version,
  VersionMeta,
} from '../../shared/contracts.js';
import { DirectEditError, assertCanEdit, editSummary, parseDirectEditRequest, planDirectEdit, publishVersion, writeAtomic } from '../direct-edit/index.js';
import type { DirectEditDeps, EditFileChange, PlannedEdit } from '../direct-edit/index.js';
import { compileTokens, cssVarFor, parseTokenFile } from './compile.js';
import { DESIGN_MD_FILE, writeFileAtomic } from './packs.js';
import { readDesignSystemState } from './state.js';
import { buildErrorMessage, readDesignSystemFiles, syncDesignSystem } from './sync.js';
import type { DesignSystemFiles } from './sync.js';
import { insertToken } from './token-insert.js';
import { recordTokenEdit, snapshotChanges } from './token-history.js';

const MAX_NAME = 40;
const MAX_VALUE = 200;
const MAX_DESCRIPTION = 200;
const CONTROL = /[\u0000-\u001f\u007f]/;
const UNSAFE = /[;{}<>\\\u0000-\u001f\u007f]/;
const DIMENSION = /^(0|(\d+\.?\d*|\.\d+)(px|rem|em))$/;
const FONT_STACK = /^[^;{}<>\\:\u0000-\u001f\u007f]+$/;
const SHADOW = /^[A-Za-z0-9 .,%#()+/-]+$/;
const GROUPS = ['color', 'font', 'text', 'space', 'radius', 'shadow'] as const;
export const DESIGN_FILES = [TOKENS_FILE, TOKENS_CSS_FILE, DESIGN_MD_FILE];

type ValueCheck = (value: string) => string | null;

const isColor: ValueCheck = (value) => (!UNSAFE.test(value) && parseColor(value) ? null : 'is not a color (use oklch(), hex, rgb() or hsl())');
const isDimension: ValueCheck = (value) => (DIMENSION.test(value) ? null : 'is not a dimension in px, rem or em');

export const VALUE_CHECKS: Record<TokenGroupName, ValueCheck> = {
  color: isColor,
  font: (value) => (FONT_STACK.test(value) ? null : 'is not a font stack (no ; : { } < > or \\)'),
  text: isDimension,
  space: isDimension,
  radius: isDimension,
  shadow: (value) => (SHADOW.test(value) ? null : 'is not a box-shadow (letters, digits, spaces and . , % # ( ) + / - only)'),
};

const valueSchema = z.string().trim().min(1).max(MAX_VALUE);

const requestSchema = z
  .object({
    group: z.enum(GROUPS),
    name: z.string().max(MAX_NAME).regex(TOKEN_NAME_PATTERN, 'name must be lowercase words joined by "-"'),
    value: valueSchema,
    darkValue: valueSchema.optional(),
    description: z
      .string()
      .max(MAX_DESCRIPTION)
      .refine((text) => !CONTROL.test(text), 'description has a control character')
      .optional(),
    apply: z.unknown().optional(),
  })
  .strict();

interface ParsedCreate {
  token: CreateTokenRequest;
  edit: DirectEditRequest | null;
}

export interface FileSnapshot {
  relative: string;
  content: string | null;
}

function invalid(message: string): DirectEditError {
  return new DirectEditError('invalid_request', message);
}

function checkValues(token: CreateTokenRequest): void {
  const check = VALUE_CHECKS[token.group];
  const problem = check(token.value);
  if (problem) throw invalid(`value "${token.value}" ${problem}`);
  if (token.darkValue === undefined) return;
  if (token.group !== 'color') throw invalid('darkValue is only allowed for color tokens');
  const darkProblem = check(token.darkValue);
  if (darkProblem) throw invalid(`darkValue "${token.darkValue}" ${darkProblem}`);
}

function parseCreateTokenRequest(raw: unknown): ParsedCreate {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
    throw invalid(`Invalid token: ${detail}`);
  }
  const { apply, ...rest } = parsed.data;
  const token: CreateTokenRequest = { group: rest.group, name: rest.name, value: rest.value };
  if (rest.darkValue !== undefined) token.darkValue = rest.darkValue;
  if (rest.description !== undefined) token.description = rest.description;
  checkValues(token);
  return { token, edit: apply === undefined ? null : parseDirectEditRequest(apply) };
}

export async function requireDesignSystem(workTree: string): Promise<DesignSystemFiles & { tokens: NonNullable<DesignSystemFiles['tokens']> }> {
  const files = await readDesignSystemFiles(workTree);
  if (files === null) throw new DirectEditError('no_design_system', 'This direction has no design system');
  if (files.tokens === null || files.errors.length > 0) throw new DirectEditError('tokens_invalid', buildErrorMessage(files.errors));
  return { ...files, tokens: files.tokens };
}

function assertTokenIsNew(files: DesignSystemFiles, token: CreateTokenRequest, cssVar: string): void {
  const group = files.tokens?.[token.group];
  const taken = typeof group === 'object' && group !== null && Object.hasOwn(group, token.name);
  if (taken) throw new DirectEditError('token_exists', `${token.group}.${token.name} already exists`);
  const owner = files.entries.find((entry) => entry.cssVar === cssVar);
  if (owner) throw new DirectEditError('token_exists', `${cssVar} is already used by ${owner.path}`);
}

function tokenNode(token: CreateTokenRequest): DesignToken {
  const node: DesignToken = { $value: token.value };
  if (token.description !== undefined) node.$description = token.description;
  if (token.darkValue !== undefined) node.$extensions = { 'studio.modes': { dark: token.darkValue } };
  return node;
}

function nextTokensText(text: string, files: DesignSystemFiles, token: CreateTokenRequest): { text: string; vars: Set<string> } {
  const next = insertToken(text, token.group, token.name, tokenNode(token));
  const parsed = next === null ? null : parseTokenFile(next).file;
  if (next === null || parsed === null) throw new DirectEditError('tokens_invalid', `design-system/tokens.json has no "${token.group}" group to add to`);
  const compiled = compileTokens(parsed, { mode: files.manifest?.mode === 'dark' ? 'dark' : 'light' });
  if (compiled.errors.length > 0) throw invalid(buildErrorMessage(compiled.errors));
  return { text: next, vars: new Set(compiled.entries.map((entry) => entry.cssVar)) };
}

export async function readSnapshot(workTree: string, relative: string): Promise<FileSnapshot> {
  const file = path.join(workTree, relative);
  return { relative, content: existsSync(file) ? await readFile(file, 'utf8') : null };
}

export async function restoreSnapshots(workTree: string, snapshots: FileSnapshot[]): Promise<void> {
  for (const snapshot of snapshots) {
    const file = path.join(workTree, snapshot.relative);
    if (snapshot.content === null) await rm(file, { force: true });
    else await writeFileAtomic(file, snapshot.content);
  }
}

function createTitle(cssVar: string, plan: PlannedEdit | null): string {
  if (plan === null) return `Add token ${cssVar}`;
  const style = plan.patch.applied.style;
  return `Add token ${cssVar} and apply to ${plan.patch.tag}${style.length > 0 ? ` ${style.join(', ')}` : ''}`;
}

function createMeta(token: CreateTokenRequest, plan: PlannedEdit | null): VersionMeta {
  const summary = `Create token ${token.group}.${token.name} = ${token.value}${token.darkValue ? ` (dark ${token.darkValue})` : ''}`;
  return { kind: 'manual', prompt: plan === null ? summary : `${summary}; ${editSummary(plan.request)}` };
}

interface CommitInput {
  tokensText: string;
  plan: PlannedEdit | null;
  cssVar: string;
  token: CreateTokenRequest;
}

async function writeAll(workTree: string, input: CommitInput): Promise<string[]> {
  await writeFileAtomic(path.join(workTree, TOKENS_FILE), input.tokensText);
  const sync = await syncDesignSystem(workTree);
  if (sync.errors.length > 0) throw new DirectEditError('tokens_invalid', buildErrorMessage(sync.errors));
  const paths = DESIGN_FILES.filter((relative) => existsSync(path.join(workTree, relative)));
  if (input.plan === null) return paths;
  if (input.plan.patch.code !== input.plan.original) await writeAtomic(input.plan.target.file, input.plan.patch.code);
  return [...paths, input.plan.target.relative];
}

async function createdChanges(workTree: string, snapshots: FileSnapshot[], plan: PlannedEdit | null): Promise<EditFileChange[] | null> {
  const changes = await snapshotChanges(workTree, snapshots);
  if (changes === null || plan === null || plan.patch.code === plan.original) return changes;
  return [...changes, { file: plan.target.file, relative: plan.target.relative, before: plan.original, after: plan.patch.code }];
}

async function writeAndCommit(deps: DirectEditDeps, project: Project, direction: Direction, input: CommitInput): Promise<Version> {
  const workTree = direction.workTree;
  const snapshots = await Promise.all(DESIGN_FILES.map((relative) => readSnapshot(workTree, relative)));
  try {
    const paths = await writeAll(workTree, input);
    const version = await deps.versions.commitFile(project, direction, paths, createTitle(input.cssVar, input.plan), createMeta(input.token, input.plan));
    if (version === null) throw new DirectEditError('no_change', 'The token did not change any tracked file');
    recordTokenEdit(deps, project, direction, version, await createdChanges(workTree, snapshots, input.plan));
    return version;
  } catch (error) {
    await restoreSnapshots(workTree, snapshots);
    if (input.plan !== null) await writeAtomic(input.plan.target.file, input.plan.original);
    throw error;
  }
}

export async function createToken(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<CreateTokenResult> {
  const { token, edit } = parseCreateTokenRequest(raw);
  assertCanEdit(deps, project, direction);
  const workTree = direction.workTree;
  const files = await requireDesignSystem(workTree);
  const cssVar = cssVarFor([token.group, token.name]);
  assertTokenIsNew(files, token, cssVar);
  const next = nextTokensText(await readFile(path.join(workTree, TOKENS_FILE), 'utf8'), files, token);
  const plan = edit === null ? null : await planDirectEdit(workTree, edit, next.vars);
  const version = await writeAndCommit(deps, project, direction, { tokensText: next.text, plan, cssVar, token });
  await publishVersion(deps, project, direction, version);
  const result = plan === null ? null : { file: plan.target.relative, version, applied: plan.patch.applied };
  return { state: await readDesignSystemState(project, direction), cssVar, version, edit: result };
}
