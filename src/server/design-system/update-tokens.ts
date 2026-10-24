import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { TOKENS_FILE } from '../../shared/contracts.js';
import type { Direction, Project, TokenChange, UpdateTokensResult, Version, VersionMeta } from '../../shared/contracts.js';
import { DirectEditError, assertCanEdit, publishVersion } from '../direct-edit/index.js';
import type { DirectEditDeps } from '../direct-edit/index.js';
import { compileTokens, parseTokenFile } from './compile.js';
import { DESIGN_FILES, readSnapshot, requireDesignSystem, restoreSnapshots } from './create-token.js';
import { writeFileAtomic } from './packs.js';
import { readDesignSystemState } from './state.js';
import { buildErrorMessage, syncDesignSystem } from './sync.js';
import { applyTokenChanges, changeVarNames, parseTokenChanges, validateTokenChanges } from './token-changes.js';
import { editTokensText } from './token-edit.js';
import { recordTokenEdit, snapshotChanges } from './token-history.js';
import { invalidateTokenSource } from './token-preview.js';

const TITLE_NAMES = 4;

export function updateTitle(changes: TokenChange[]): string {
  const names = changeVarNames(changes);
  const shown = names.slice(0, TITLE_NAMES).join(', ');
  const more = names.length > TITLE_NAMES ? ` +${names.length - TITLE_NAMES} more` : '';
  return `Update tokens: ${shown}${more}`;
}

function describeChange(change: TokenChange): string {
  const parts: string[] = [];
  if (change.value !== undefined) parts.push(`= ${change.value}`);
  if (change.darkValue === null) parts.push('(remove dark)');
  else if (change.darkValue !== undefined) parts.push(`(dark ${change.darkValue})`);
  return `${change.path} ${parts.join(' ')}`;
}

function updateMeta(changes: TokenChange[]): VersionMeta {
  return { kind: 'manual', prompt: `Update tokens: ${changes.map(describeChange).join('; ')}` };
}

function nextText(text: string, changes: TokenChange[], expected: unknown): string {
  const edited = editTokensText(text, changes);
  const parsed = edited === null ? null : parseTokenFile(edited).file;
  if (edited === null || !isDeepStrictEqual(parsed, expected)) {
    throw new DirectEditError('tokens_invalid', 'design-system/tokens.json could not be edited in place');
  }
  return edited;
}

async function writeAndCommit(deps: DirectEditDeps, project: Project, direction: Direction, text: string, changes: TokenChange[]): Promise<Version> {
  const workTree = direction.workTree;
  const snapshots = await Promise.all(DESIGN_FILES.map((relative) => readSnapshot(workTree, relative)));
  try {
    await writeTokensText(workTree, text);
    const paths = DESIGN_FILES.filter((relative) => existsSync(path.join(workTree, relative)));
    const version = await deps.versions.commitFile(project, direction, paths, updateTitle(changes), updateMeta(changes));
    if (version === null) throw new DirectEditError('no_change', 'The token changes did not change any tracked file');
    recordTokenEdit(deps, project, direction, version, await snapshotChanges(workTree, snapshots));
    return version;
  } catch (error) {
    await restoreSnapshots(workTree, snapshots);
    throw error;
  } finally {
    invalidateTokenSource(workTree);
  }
}

export async function plannedTokensText(workTree: string, changes: TokenChange[]): Promise<string | null> {
  const files = await requireDesignSystem(workTree);
  validateTokenChanges(files.tokens, changes);
  const next = applyTokenChanges(files.tokens, changes);
  if (isDeepStrictEqual(next, files.tokens)) return null;
  const compiled = compileTokens(next, { mode: files.manifest?.mode === 'dark' ? 'dark' : 'light' });
  if (compiled.errors.length > 0) throw new DirectEditError('invalid_request', buildErrorMessage(compiled.errors));
  return nextText(await readFile(path.join(workTree, TOKENS_FILE), 'utf8'), changes, next);
}

export async function writeTokensText(workTree: string, text: string): Promise<void> {
  await writeFileAtomic(path.join(workTree, TOKENS_FILE), text);
  const sync = await syncDesignSystem(workTree);
  if (sync.errors.length > 0) throw new DirectEditError('tokens_invalid', buildErrorMessage(sync.errors));
}

export async function updateTokens(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<UpdateTokensResult> {
  const changes = parseTokenChanges(raw);
  assertCanEdit(deps, project, direction);
  const workTree = direction.workTree;
  const text = await plannedTokensText(workTree, changes);
  if (text === null) throw new DirectEditError('no_change', 'The token values are already set');
  const version = await writeAndCommit(deps, project, direction, text, changes);
  await publishVersion(deps, project, direction, version);
  return { state: await readDesignSystemState(project, direction), version };
}
