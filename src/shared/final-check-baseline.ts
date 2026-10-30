import type { CheckViewport, FinalCheck, LayoutFinding, QualityFinding, QualitySeverity, RenderCheckResult } from './contracts.js';

export type CheckLevel = 'error' | QualitySeverity;

export interface CheckItem {
  key: string;
  level: CheckLevel;
}

export interface BaselineFindings {
  at: number;
  url: string | null;
  screens: string[];
  items: CheckItem[];
}

export interface FinalCheckBaseline {
  errors: number;
  high: number;
  medium: number;
  low: number;
  keys: string[];
}

export type FinalCheckWithBaseline = FinalCheck & { baseline?: FinalCheckBaseline };

export function baselineFindingsFile(runId: string): string {
  return `${runId}-baseline-findings.json`;
}

function plain(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\d+(?:\.\d+)?/g, '#').trim().slice(0, 240);
}

export function consoleKey(viewport: CheckViewport, message: string): string {
  return `${viewport}|console|${plain(message)}`;
}

export function layoutKey(viewport: CheckViewport, finding: Pick<LayoutFinding, 'kind' | 'axis' | 'selector'>): string {
  return `${viewport}|layout|${finding.kind}|${finding.axis}|${finding.selector}`;
}

function qualityKey(viewport: CheckViewport, finding: QualityFinding): string {
  return `${finding.viewport ?? viewport}|${finding.check}|${finding.selector ?? ''}|${plain(finding.message)}`;
}

function isChangeReport(finding: QualityFinding): boolean {
  return finding.check === 'visual-diff' && finding.severity === 'low';
}

export function checkItems(results: readonly RenderCheckResult[]): CheckItem[] {
  return results.flatMap((result) => {
    const view = result.viewport;
    const errors = [...result.consoleErrors, ...result.pageErrors].map((message): CheckItem => ({ key: consoleKey(view, message), level: 'error' }));
    const overflow: CheckItem[] = result.horizontalOverflow ? [{ key: `${view}|overflow`, level: 'error' }] : [];
    const layout = result.layout.filter((finding) => finding.severity === 'error').map((finding): CheckItem => ({ key: layoutKey(view, finding), level: 'error' }));
    const quality = (result.quality ?? []).filter((finding) => !isChangeReport(finding)).map((finding): CheckItem => ({ key: qualityKey(view, finding), level: finding.severity }));
    return [...errors, ...overflow, ...layout, ...quality];
  });
}

export function keyCounts(keys: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

export function takeKey(counts: Map<string, number>, key: string): boolean {
  const left = counts.get(key) ?? 0;
  if (left <= 0) return false;
  counts.set(key, left - 1);
  return true;
}

export function splitByBaseline(items: readonly CheckItem[], baseline: readonly CheckItem[]): { fresh: CheckItem[]; old: CheckItem[] } {
  const counts = keyCounts(baseline.map((item) => `${item.level}|${item.key}`));
  const fresh: CheckItem[] = [];
  const old: CheckItem[] = [];
  for (const item of items) (takeKey(counts, `${item.level}|${item.key}`) ? old : fresh).push(item);
  return { fresh, old };
}

export function levelCounts(items: readonly CheckItem[]): Record<CheckLevel, number> {
  const counts: Record<CheckLevel, number> = { error: 0, high: 0, medium: 0, low: 0 };
  for (const item of items) counts[item.level] += 1;
  return counts;
}
