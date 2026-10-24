import type { Version } from './contracts.js';

export interface RewindRun {
  versionId: string | null;
  startedAt: number;
}

export function forkBaseOf(run: RewindRun, versions: readonly Pick<Version, 'id' | 'parentId' | 'createdAt'>[]): string | null {
  if (run.versionId) return versions.find((version) => version.id === run.versionId)?.parentId ?? null;
  let base: Pick<Version, 'id' | 'createdAt'> | null = null;
  for (const version of versions) {
    if (version.createdAt <= run.startedAt && (!base || version.createdAt > base.createdAt)) base = version;
  }
  return base?.id ?? null;
}

export function runQueryTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

export function runMatches(terms: readonly string[], prompt: string, title?: string): boolean {
  if (terms.length === 0) return true;
  const text = `${title ?? ''}\n${prompt}`.toLowerCase();
  return terms.every((term) => text.includes(term));
}
