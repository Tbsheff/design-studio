import { createHash } from 'node:crypto';
import type { Direction, LayoutFinding, Project } from '../../shared/contracts.js';
import { REVIEW_KIND_LABEL, REVIEW_KINDS, type ReviewFinding, type ReviewFrame, type ReviewResult, type ReviewSeverity } from '../../shared/review.js';
import { readDesignSystemState } from '../design-system/state.js';
import { waitForPage } from '../export/capture.js';
import { withPagePath } from '../export/source.js';
import { loadAxeSource, pickRules } from '../preview/axe.js';
import { layoutProbeExpression, type LayoutProbeResult } from '../preview/layout-probe.js';
import type { RenderPage } from '../preview/render-backend.js';
import type { PreviewService } from '../types.js';
import { BadRequestError } from '../store/errors.js';
import { axeDrafts, axeSelector, groupKitTokens, layoutDrafts, REVIEW_AXE_RULES, tapDrafts, tokenDrafts, type AxeViolation, type Draft } from './checks.js';
import { verifyFixes } from './fixes.js';
import { markShared, pageOwnDir } from './shared-files.js';
import { reviewProbeExpression, type ProbeResult } from './probe.js';
import type { DesignRule } from '../../shared/design-rules.js';
import { applyTokenRules, probeRules, ruleDrafts } from '../design-rules/check.js';

const LAYOUT_CAP = 12;
const TOKEN_CAP = 60;
const SEVERITY_RANK: Record<ReviewSeverity, number> = { high: 0, medium: 1, low: 2 };

export const DEFAULT_REVIEW_FRAME: ReviewFrame = { width: 1440, height: 900 };

interface PageFacts {
  matched: number;
  violations: AxeViolation[];
  layout: LayoutFinding[];
  probe: ProbeResult;
}

async function ownAxe(page: RenderPage, context: string): Promise<AxeViolation[]> {
  await page.evaluate(`${await loadAxeSource()}\n;0`);
  return page.evaluate<AxeViolation[]>(`window.axe.run(${context}, { runOnly: { type: 'rule', values: ${JSON.stringify(REVIEW_AXE_RULES)} }, resultTypes: ['violations'] }).then((result) => result.violations)`);
}

async function readPage(page: RenderPage, app: boolean, within: string | undefined): Promise<PageFacts> {
  await waitForPage(page);
  const context = within ? `document.querySelector(${JSON.stringify(within)})` : 'document';
  const matched = within ? await page.evaluate<number>(`(() => { try { return document.querySelectorAll(${JSON.stringify(within)}).length; } catch { return 0; } })()`) : 0;
  if (within && matched === 0) throw new BadRequestError(`No element matches selector ${within} on this page. Check it with get_screenshot or the canvas selection.`);
  const violations = !within && page.axe ? pickRules((await page.axe()) as AxeViolation[], REVIEW_AXE_RULES) : await ownAxe(page, context);
  const layout = await page.evaluate<LayoutProbeResult>(layoutProbeExpression(LAYOUT_CAP));
  const selectors = [...new Set(violations.flatMap((violation) => violation.nodes.map(axeSelector)).filter((selector): selector is string => selector !== null))];
  const probe = await page.evaluate<ProbeResult>(reviewProbeExpression({ selectors, app, scanRules: true, cap: TOKEN_CAP }));
  return { matched, violations, layout: layout.findings, probe };
}

async function insideRoot(page: RenderPage, root: string, drafts: Draft[]): Promise<Draft[]> {
  const selectors = drafts.map((draft) => draft.selector);
  const inside = await page.evaluate<boolean[]>(
    `(() => { const root = document.querySelector(${JSON.stringify(root)}); return ${JSON.stringify(selectors)}.map((s) => { if (!root || !s) return false; try { const el = document.querySelector(s); return Boolean(el && root.contains(el)); } catch { return false; } }); })()`,
  );
  return drafts.filter((_draft, index) => inside[index] === true);
}

function findingId(draft: Draft): string {
  return `${draft.kind}-${createHash('sha1').update(`${draft.kind}|${draft.key}`).digest('hex').slice(0, 10)}`;
}

export function frameName(frame: ReviewFrame): string {
  const page = frame.path ? ` (${frame.path})` : '';
  return `${frame.label ?? frame.id ?? `${frame.width}x${frame.height}`}${page}`;
}

function askText(draft: Draft, frame: ReviewFrame): string {
  const where = [draft.source ? `at ${draft.source}` : null, draft.selector ? `selector ${draft.selector}` : null].filter(Boolean).join(', ');
  return `Review finding in frame ${frameName(frame)}, ${REVIEW_KIND_LABEL[draft.kind].toLowerCase()} (${draft.severity}): ${draft.message}\nElement: ${draft.element}${where ? ` (${where})` : ''}.\n${draft.hint}`;
}

function toFinding(draft: Draft, frame: ReviewFrame): ReviewFinding {
  return { id: findingId(draft), kind: draft.kind, severity: draft.severity, selector: draft.selector, source: draft.source, element: draft.element, message: draft.message, fix: draft.fix, ask: askText(draft, frame), ...(draft.shared ? { shared: draft.shared } : {}), ...(draft.rule ? { rule: draft.rule } : {}) };
}

function ordered(findings: ReviewFinding[]): ReviewFinding[] {
  const kindRank = (finding: ReviewFinding) => REVIEW_KINDS.indexOf(finding.kind);
  return [...findings].sort((a, b) => kindRank(a) - kindRank(b) || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

function unique(findings: ReviewFinding[]): ReviewFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => !seen.has(finding.id) && Boolean(seen.add(finding.id)));
}

function noTokensNote(probe: ProbeResult): string {
  if (probe.tokens.some((hit) => hit.via === 'class')) return 'This project has no design tokens, so only Tailwind arbitrary values such as p-[6px] count as off-token.';
  return 'This project has no design tokens yet, so Review skips the off-token check.';
}

function copyKey(finding: ReviewFinding): string | null {
  return finding.source ? `${finding.kind}|${finding.source}|${finding.message}` : null;
}

function grouped(findings: ReviewFinding[]): ReviewFinding[] {
  const first = new Map<string, ReviewFinding>();
  const out: ReviewFinding[] = [];
  for (const finding of findings) {
    const key = copyKey(finding);
    const seen = key ? first.get(key) : undefined;
    if (seen) {
      seen.copies = (seen.copies ?? 1) + 1;
      continue;
    }
    if (key) first.set(key, finding);
    out.push(finding);
  }
  return out;
}

function counts(findings: ReviewFinding[]): Record<ReviewSeverity, number> {
  const out: Record<ReviewSeverity, number> = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) out[finding.severity] += 1;
  return out;
}

function fromAppSource(draft: Draft): boolean {
  return draft.source !== null && !draft.source.includes('node_modules/');
}

function keepSharedAsk(drafts: Draft[], appDir: string): Draft[] {
  const prefix = appDir ? `${appDir.replace(/\/+$/, '')}/` : '';
  for (const draft of drafts) {
    const file = draft.fix?.edit.source.file;
    if (!file || !prefix || file.startsWith(prefix)) continue;
    draft.fix = null;
    draft.hint = `This element comes from shared code at ${file}, so a change there reaches every place that uses it. ${draft.hint}`;
  }
  return drafts;
}

function selectorNote(selector: string, matched: number): string {
  if (matched <= 1) return `1 element matches ${selector}; only findings inside it are shown.`;
  return `${matched} elements match ${selector}; only findings inside the first one are shown. Pass a more exact selector or a layer id from get_layers for another one.`;
}

export interface ReviewTarget {
  project: Project;
  direction: Direction;
  frame: ReviewFrame;
  baseUrl?: string;
  rules?: DesignRule[];
}

export async function runReview(preview: PreviewService, target: ReviewTarget): Promise<ReviewResult> {
  const { project, direction, frame } = target;
  if (!preview.withPage) throw new Error('rendering is not available');
  const url = withPagePath(target.baseUrl ?? (await preview.directionUrl(project, direction)), frame.path || undefined);
  const entries = (await readDesignSystemState(project, direction)).entries;
  const { facts, all } = await preview.withPage(url, { width: frame.width, height: frame.height }, async (page) => {
    const read = await readPage(page, Boolean(project.app), frame.selector);
    const rules = target.rules ?? [];
    const ruleHits = await probeRules(page, rules, Boolean(project.app));
    const base = [...axeDrafts(read.violations, read.probe.elements, entries), ...tapDrafts(read.probe.taps, entries), ...tokenDrafts(read.probe.tokens, read.probe.tokenElements, entries, TOKEN_CAP), ...layoutDrafts(read.layout)];
    const found = [...applyTokenRules(rules, base), ...ruleDrafts(rules, ruleHits.hits)];
    return { facts: read, all: frame.selector ? await insideRoot(page, frame.selector, found) : found };
  });
  const drafts = project.app ? keepSharedAsk(all.filter(fromAppSource), project.app.appDir) : all;
  await verifyFixes(project, direction, drafts);
  markShared(drafts, await pageOwnDir(project, direction, frame.path));
  const findings = ordered(groupKitTokens(grouped(unique(drafts.map((draft) => toFinding(draft, frame)))), project.app ? project.app.appDir : null));
  const notes = [
    ...(entries.length === 0 ? [noTokensNote(facts.probe)] : []),
    ...(frame.selector ? [selectorNote(frame.selector, facts.matched)] : []),
    ...(all.length > drafts.length ? [`${all.length - drafts.length} findings on elements outside the app source (for example dev tool overlays) are not shown.`] : []),
  ];
  const matched = frame.selector ? { matched: { count: facts.matched, note: selectorNote(frame.selector, facts.matched) } } : {};
  return { projectId: project.id, directionId: direction.id, frame, versionId: direction.headVersionId, ranAt: Date.now(), findings, counts: counts(findings), notes, ...matched };
}

const cache = new Map<string, ReviewResult>();

export function rememberReview(result: ReviewResult): void {
  cache.set(`${result.projectId}:${result.directionId}`, result);
}

export function lastReview(projectId: string, directionId: string): ReviewResult | null {
  return cache.get(`${projectId}:${directionId}`) ?? null;
}
