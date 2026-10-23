import type { CheckViewport, NavSummary, QualityCheckName, QualityFinding, QualitySeverity, RenderCheckResult } from '../../shared/contracts.js';
import type { PlaceholderMode } from '../../shared/run-levels.js';
import type { DuplicateHit, GenericHit, PlaceholderHit, TapHit } from './quality-probe.js';

const MAX_FINDINGS_PER_CHECK = 8;

const SEVERITY_RANK: Record<QualitySeverity, number> = { high: 0, medium: 1, low: 2 };

export function tapFindings(hits: TapHit[], viewport: CheckViewport): QualityFinding[] {
  return hits.map((hit) => {
    const smallest = Math.min(hit.width, hit.height);
    return {
      check: 'tap-target',
      severity: smallest < 24 ? 'high' : 'medium',
      viewport,
      selector: hit.selector,
      source: hit.source,
      message: `"${hit.text || hit.selector}" is ${hit.width}x${hit.height} px; touch targets need at least 44x44 px.`,
      fix: 'Add padding or an invisible ::after hit area so the target is at least 44x44 px.',
    };
  });
}

function placeholderSeverity(hit: PlaceholderHit, mode: Exclude<PlaceholderMode, 'off'>): QualitySeverity {
  return hit.optedOut ? 'low' : mode;
}

export function placeholderFindings(hits: PlaceholderHit[], mode: PlaceholderMode, viewport: CheckViewport): QualityFinding[] {
  if (mode === 'off') return [];
  return hits.map((hit) => ({
    check: 'placeholder',
    severity: placeholderSeverity(hit, mode),
    viewport,
    selector: hit.selector,
    source: hit.source,
    message: `Visible draft or placeholder text "${hit.match}": "${hit.text}"${hit.optedOut ? ' (marked data-sample)' : ''}.`,
    fix: 'Write the real copy, or a realistic sample value without draft words.',
  }));
}

const GENERIC_FIX: Record<GenericHit['pattern'], string> = {
  'plan-cards': 'Make one layout change that fits the content, for example a plan selector with one detailed plan column, or the comparison table first with plan names and prices in its header. Keep every plan, price and feature.',
  'hero-feature-cards': 'Make one layout change that fits the content, for example one large proof point with a short supporting list, or a split layout with the product in use.',
  'all-centered': 'Left-align body sections on a shared column edge, and keep centering for one moment at most.',
};

export function genericFindings(hits: GenericHit[]): QualityFinding[] {
  return hits.map((hit) => ({
    check: 'generic-layout',
    severity: 'medium',
    viewport: 'desktop',
    selector: hit.selector,
    source: hit.source,
    message: `Stock layout pattern "${hit.pattern}": ${hit.detail}.`,
    fix: GENERIC_FIX[hit.pattern],
  }));
}

export function duplicateFindings(hits: DuplicateHit[], viewport: CheckViewport): QualityFinding[] {
  return hits.map((hit) => ({
    check: 'duplicate-content',
    severity: 'medium',
    viewport,
    selector: hit.selectors.join(' | '),
    source: hit.sources.find((source) => source !== null) ?? null,
    message: `The ${hit.kind === 'price' ? 'price' : 'call to action'} "${hit.text}" shows ${hit.count} times at ${viewport}: ${hit.selectors.join(' | ')}.`,
    fix: 'Keep each fact once per viewport: merge it into one place and delete the other block. If the repeat is on purpose (for example a sticky header CTA), mark it with data-studio-repeat and say why in your reply.',
  }));
}

function navFinding(desktop: NavSummary, other: NavSummary, viewport: CheckViewport): QualityFinding | null {
  if (desktop.visibleLinks < 2) return null;
  if (other.visibleLinks >= Math.min(2, desktop.visibleLinks) || other.menuControl) return null;
  return {
    check: 'nav-mobile',
    severity: 'high',
    viewport,
    selector: null,
    source: null,
    message: `Desktop shows ${desktop.visibleLinks} navigation links; at ${viewport} ${other.visibleLinks} are visible and there is no menu button.`,
    fix: 'Keep navigation reachable: wrap the links, scroll them with a visible cue, or add a menu button with aria-expanded. Do not remove the nav.',
  };
}

export function navFindings(results: Pick<RenderCheckResult, 'viewport' | 'nav'>[]): QualityFinding[] {
  const desktop = results.find((result) => result.viewport === 'desktop')?.nav;
  if (!desktop) return [];
  return results
    .filter((result) => result.viewport !== 'desktop' && result.nav)
    .map((result) => navFinding(desktop, result.nav as NavSummary, result.viewport))
    .filter((finding): finding is QualityFinding => finding !== null);
}

interface CappedFindings {
  findings: QualityFinding[];
  omitted: Partial<Record<QualityCheckName, number>>;
}

export function sortFindings(findings: QualityFinding[]): QualityFinding[] {
  return [...findings].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export function capFindings(findings: QualityFinding[], cap = MAX_FINDINGS_PER_CHECK): CappedFindings {
  const kept: QualityFinding[] = [];
  const counts = new Map<QualityCheckName, number>();
  const omitted: Partial<Record<QualityCheckName, number>> = {};
  for (const finding of sortFindings(findings)) {
    const seen = counts.get(finding.check) ?? 0;
    counts.set(finding.check, seen + 1);
    if (seen < cap) kept.push(finding);
    else omitted[finding.check] = (omitted[finding.check] ?? 0) + 1;
  }
  return { findings: kept, omitted };
}

export function countSeverities(findings: QualityFinding[]): Record<QualitySeverity, number> {
  const counts: Record<QualitySeverity, number> = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}
