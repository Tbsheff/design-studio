import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ElementScope } from '../../shared/element-variants.js';

export function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function elementOf(code: string, scope: ElementScope): string | null {
  if (code.length < scope.start + scope.suffixLength) return null;
  if (hash(code.slice(0, scope.start)) !== scope.prefixHash) return null;
  const end = code.length - scope.suffixLength;
  if (hash(code.slice(end)) !== scope.suffixHash) return null;
  return code.slice(scope.start, end);
}

export async function scopeProblem(workTree: string, changed: readonly string[], scope: ElementScope): Promise<string | null> {
  const others = changed.filter((file) => file !== scope.file);
  if (others.length) {
    const list = others.slice(0, 3).join(', ');
    return `Rejected: this variant changed ${others.length === 1 ? 'another file' : 'other files'} (${list}${others.length > 3 ? ', …' : ''}). Only lines ${scope.startLine}-${scope.endLine} of ${scope.file} may change. The changes were discarded.`;
  }
  if (!changed.includes(scope.file)) return null;
  const code = await readFile(path.join(workTree, scope.file), 'utf8').catch(() => null);
  if (code === null) return `Rejected: this variant removed ${scope.file}. The changes were discarded.`;
  if (elementOf(code, scope) !== null) return null;
  const prefixOk = code.length >= scope.start && hash(code.slice(0, scope.start)) === scope.prefixHash;
  const where = prefixOk ? `after line ${scope.endLine}` : `before line ${scope.startLine}`;
  return `Rejected: this variant changed ${scope.file} outside the selected element (${where}). Only lines ${scope.startLine}-${scope.endLine} may change. The changes were discarded.`;
}
