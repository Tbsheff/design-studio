import { z } from 'zod';
import type { TokenChange, TokenFile, TokenGroupName } from '../../shared/contracts.js';
import { DirectEditError } from '../direct-edit/index.js';
import { cssVarFor } from './compile.js';
import { VALUE_CHECKS } from './create-token.js';

const MAX_CHANGES = 100;
const MAX_PATH = 120;
const MAX_VALUE = 200;
const WHOLE_ALIAS = /^\{[A-Za-z0-9_.-]+\}$/;
const PATH_PATTERN = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+$/;
const UNSAFE = /[;{}<>\\\u0000-\u001f\u007f]/;
const MODES = 'studio.modes';

type TokenNode = Record<string, unknown>;

const valueSchema = z.string().trim().min(1).max(MAX_VALUE);

const changeSchema = z
  .object({
    path: z.string().max(MAX_PATH).regex(PATH_PATTERN, 'path must look like color.primary'),
    value: valueSchema.optional(),
    darkValue: valueSchema.nullable().optional(),
  })
  .strict()
  .refine((change) => change.value !== undefined || change.darkValue !== undefined, 'a change needs value or darkValue');

const requestSchema = z.object({ changes: z.array(changeSchema).min(1).max(MAX_CHANGES) }).strict();

function invalid(message: string): DirectEditError {
  return new DirectEditError('invalid_request', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toChange(raw: z.infer<typeof changeSchema>): TokenChange {
  const change: TokenChange = { path: raw.path };
  if (raw.value !== undefined) change.value = raw.value;
  if (raw.darkValue !== undefined) change.darkValue = raw.darkValue;
  return change;
}

export function parseTokenChanges(raw: unknown): TokenChange[] {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
    throw invalid(`Invalid token changes: ${detail}`);
  }
  const changes = parsed.data.changes.map(toChange);
  const seen = new Set<string>();
  for (const change of changes) {
    if (seen.has(change.path)) throw invalid(`${change.path} appears more than once`);
    seen.add(change.path);
  }
  return changes;
}

function tokenNodeAt(file: TokenFile, path: string): TokenNode | null {
  let node: unknown = file;
  for (const segment of path.split('.')) {
    if (!isRecord(node) || segment.startsWith('$') || !Object.hasOwn(node, segment)) return null;
    node = node[segment];
  }
  return isRecord(node) && '$value' in node ? node : null;
}

function checkValue(group: string, label: string, value: string): void {
  if (WHOLE_ALIAS.test(value)) return;
  const check = Object.hasOwn(VALUE_CHECKS, group) ? VALUE_CHECKS[group as TokenGroupName] : null;
  const problem = check ? check(value) : UNSAFE.test(value) ? 'must not contain ; { } < > or \\' : null;
  if (problem) throw invalid(`${label} "${value}" ${problem}`);
}

export function validateTokenChanges(file: TokenFile, changes: TokenChange[]): void {
  for (const change of changes) {
    if (tokenNodeAt(file, change.path) === null) {
      throw new DirectEditError('unknown_token', `${change.path} is not a token of this design system`, 404);
    }
    const group = change.path.split('.')[0] ?? '';
    if (change.value !== undefined) checkValue(group, `${change.path} value`, change.value);
    if (typeof change.darkValue !== 'string') continue;
    if (group !== 'color') throw invalid(`${change.path}: darkValue is only allowed for color tokens`);
    checkValue(group, `${change.path} darkValue`, change.darkValue);
  }
}

function setDark(node: TokenNode, dark: string): void {
  const extensions = isRecord(node.$extensions) ? node.$extensions : {};
  const modes = isRecord(extensions[MODES]) ? extensions[MODES] : {};
  modes.dark = dark;
  extensions[MODES] = modes;
  node.$extensions = extensions;
}

function removeDark(node: TokenNode): void {
  const extensions = node.$extensions;
  if (!isRecord(extensions) || !isRecord(extensions[MODES])) return;
  const modes = extensions[MODES];
  delete modes.dark;
  if (Object.keys(modes).length === 0) delete extensions[MODES];
  if (Object.keys(extensions).length === 0) delete node.$extensions;
}

export function applyTokenChanges(file: TokenFile, changes: TokenChange[]): TokenFile {
  const next = structuredClone(file);
  for (const change of changes) {
    const node = tokenNodeAt(next, change.path);
    if (node === null) continue;
    if (change.value !== undefined) node.$value = change.value;
    if (change.darkValue === null) removeDark(node);
    else if (change.darkValue !== undefined) setDark(node, change.darkValue);
  }
  return next;
}

export function changeVarNames(changes: TokenChange[]): string[] {
  return changes.map((change) => cssVarFor(change.path.split('.')));
}
