import type { VersionKind } from './contracts';

export const RUN_TITLE_MAX = 60;

const CLAUSE_END = /[:;]\s|\.\s|\s[—–-]\s|\n/;
const LEGACY_WRAP = /^(?:Undo to|Restore) "(.*)"$/s;
const CURRENT_WRAP = /^(?:Back to|Restored) (.+)$/s;

function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max - 1);
  const space = head.lastIndexOf(' ');
  const cut = space > max / 2 ? head.slice(0, space) : head;
  return `${cut.replace(/[\s,.;:—–-]+$/, '')}…`;
}

export function runTitle(prompt: string): string {
  const flat = prompt.replace(/\r/g, '').trim();
  const clause = (flat.split(CLAUSE_END)[0] ?? '').replace(/\s+/g, ' ').trim();
  return clause === '' ? 'Untitled run' : cutAtWord(clause, RUN_TITLE_MAX);
}

export function isRestoreKind(kind: VersionKind): kind is 'undo' | 'restore' {
  return kind === 'undo' || kind === 'restore';
}

export function baseTitle(title: string, kind: VersionKind): string {
  let current = title.trim();
  if (!isRestoreKind(kind)) return current;
  for (let depth = 0; depth < 32; depth += 1) {
    const match = LEGACY_WRAP.exec(current) ?? CURRENT_WRAP.exec(current);
    if (!match?.[1]) return current;
    current = match[1].trim();
  }
  return current;
}

export function restoreTitle(kind: 'undo' | 'restore', base: string): string {
  const shown = base.trim() || 'an earlier version';
  return kind === 'undo' ? `Back to ${shown}` : `Restored ${shown}`;
}
