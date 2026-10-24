import type { Version } from '../shared/contracts';
import { baseTitle, isRestoreKind, restoreTitle, runTitle } from '../shared/version-title';
import type { IconName } from './components/Icon';

export type VersionIndex = ReadonlyMap<string, Version>;

interface KindInfo {
  label: string;
  icon: IconName;
  hint: string;
}

const MAX_CHAIN = 64;

const KIND_INFO: Record<Exclude<Version['meta']['kind'], 'manual'>, KindInfo> = {
  init: { label: 'Start', icon: 'file', hint: 'First version of this project' },
  run: { label: 'Run', icon: 'sparkle', hint: 'Made by the agent from a prompt' },
  undo: { label: 'Undo', icon: 'undo', hint: 'Undid the version below it' },
  restore: { label: 'Restore', icon: 'restore', hint: 'Brought back an earlier version' },
  keep: { label: 'Kept', icon: 'check', hint: 'Kept unfinished changes from a stopped run' },
  fork: { label: 'Branch', icon: 'branch', hint: 'Start of a new direction' },
};

const EDIT_INFO: Record<'tokens' | 'design-md' | 'design-system' | 'element', KindInfo> = {
  'design-system': { label: 'Design system', icon: 'palette', hint: 'You applied or switched the design system' },
  tokens: { label: 'Tokens', icon: 'token', hint: 'You changed design tokens' },
  'design-md': { label: 'DESIGN.md', icon: 'doc', hint: 'You edited DESIGN.md' },
  element: { label: 'Edit', icon: 'pencil', hint: 'You edited an element' },
};

export function indexVersions(versions: Version[]): VersionIndex {
  return new Map(versions.map((v) => [v.id, v]));
}

function manualSort(title: string): keyof typeof EDIT_INFO {
  if (/^(Update tokens|Add token)\b/.test(title)) return 'tokens';
  if (title.startsWith('Update DESIGN.md')) return 'design-md';
  if (/^(Apply|Switch to) .+ design system$/.test(title)) return 'design-system';
  return 'element';
}

export function kindInfo(v: Version): KindInfo {
  return v.meta.kind === 'manual' ? EDIT_INFO[manualSort(v.title)] : KIND_INFO[v.meta.kind];
}

export function originOf(v: Version, index: VersionIndex): Version | null {
  let current: Version | undefined = v;
  for (let depth = 0; depth < MAX_CHAIN && current && isRestoreKind(current.meta.kind); depth += 1) {
    const from: string | undefined = current.meta.restoredFrom;
    current = from ? index.get(from) : undefined;
  }
  return current && current !== v ? current : null;
}

function plainTitle(v: Version): string {
  return v.meta.kind === 'run' ? runTitle(v.title) : v.title;
}

export function displayTitle(v: Version, index: VersionIndex): string {
  const kind = v.meta.kind;
  if (!isRestoreKind(kind)) return plainTitle(v);
  const origin = originOf(v, index);
  return restoreTitle(kind, origin ? plainTitle(origin) : baseTitle(v.title, kind));
}

export function undoneOf(v: Version, index: VersionIndex): Version | null {
  if (v.meta.kind !== 'undo' || !v.parentId) return null;
  return index.get(v.parentId) ?? null;
}

export function fullText(v: Version): string | null {
  const prompt = v.meta.prompt?.trim();
  return prompt ? prompt : null;
}
