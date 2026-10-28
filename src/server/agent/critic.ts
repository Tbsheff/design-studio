import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Options, SDKMessage, SDKUserMessage, query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { QualityFinding } from '../../shared/contracts.js';
import { diffImages, readPng } from '../preview/visual-diff.js';
import type { PreviewService } from '../types.js';
import type { RunToolState } from './check-tool.js';
import { changedSince, type RunScreen } from './screens.js';
import type { TasteRule } from './taste.js';

type QueryFn = typeof query;

const CRITIC_TILES = { desktop: { width: 1440, height: 900, tileHeight: 900, maxTiles: 3 }, mobile: { width: 390, height: 844, tileHeight: 1560, maxTiles: 2 } } as const;
const SCREEN_TILES = { desktop: { width: 1440, height: 900, tileHeight: 1200, maxTiles: 1 }, mobile: { width: 390, height: 844, tileHeight: 1560, maxTiles: 1 } } as const;
const CHANGED_FILES = 4;
const CHANGED_FILE_CHARS = 6000;
const CHANGED_TOTAL_CHARS = 14_000;
const REGRESSION_MIN_PCT = 0.2;

const CriticIssueSchema = z.object({
  severity: z.enum(['high', 'medium', 'low']),
  area: z.string().min(1),
  screen: z.string().optional(),
  where: z.string().min(1),
  problem: z.string().min(1),
  fix: z.string().min(1),
});

export type CriticIssue = z.infer<typeof CriticIssueSchema>;

const CriticReplySchema = z.union([z.array(CriticIssueSchema), z.object({ issues: z.array(CriticIssueSchema) }).transform((value) => value.issues)]);

const SCREEN_RULE = `- The images can show several screens of one flow (views of one page, canvas frames or app routes). Review EVERY screen, not only the first, and set "screen" in each issue to the screen name from the image label. A screen marked "opened by the studio without its click path" can have empty text that a script fills in the real flow: do not file empty dynamic text on it.`;

const CRITIC_SYSTEM = `You are a senior product design critic. You did not build this design and you owe its builder nothing. Judge it with fresh eyes from the screenshots, the automatic check findings and the request.
${SCREEN_RULE}
- Find what a demanding design lead would send back: hierarchy, layout and rhythm, alignment (edges of blocks that should line up, such as a list, its rules and the footer under it), typography, color and contrast, copy (generic, placeholder or contradicting text), interaction states, accessibility, and mobile fit (clipped content, sideways scroll, hidden navigation, tables that do not restack).
- Judge against the user's taste rules when they are given. The <design-rules> block holds the project's hard design rules: file each break as an issue with "area": "design-rule" and quote the rule.
- Judge distinctiveness: does the layout fit this request and content, or is it a stock template (for pricing: three equal plan cards with the middle one raised, then a table and an FAQ; for landing pages: a hero and three feature cards; every section centered)? A \`generic-layout\` check finding is a strong hint. If it is generic, file exactly one issue with "area": "generic-layout" and severity medium, and make its fix ONE concrete layout change that fits the content and keeps all of it (for pricing, for example: a plan selector with one detailed plan column, or the comparison table first with plan names and prices in its header). The change must merge: the content moves into the new structure and the old blocks go away.
- Check for duplicated facts: the same price, plan name with price, or call to action shown twice at one screen size (for example plan cards that repeat the prices already in a table header). File it as "area": "duplicate-content", severity medium, and say which copy to remove. Make sure no fact is dropped.
- Do not praise. Do not repeat a finding unless you add a concrete fix.
- Answer with JSON only: an array of at most 10 issues, worst first, each {"severity":"high"|"medium"|"low","area":"...","screen":"screen name","where":"section or element","problem":"...","fix":"one concrete change"}. Use high for issues that break the request, the layout or accessibility; medium for clear quality problems; low for polish.`;

const QUICK_SYSTEM = `You are a fresh-eyes design reviewer. You did not build this design. Look at the screenshots and report only clear problems.
${SCREEN_RULE}
Check only:
1. Broken layout: overlap, clipped text, sideways scroll, edges that should line up but do not.
2. Short labels that wrap (times, prices, button text) and buttons that crowd each other.
3. Legibility: low contrast, text too small.
4. Hierarchy: each screen has one clear main action and a clear heading.
5. Mobile fit at 390 px.
6. The same fact shown twice on one screen ("area": "duplicate-content").
7. Placeholder, generic or contradicting copy.
Do not praise. Answer with JSON only: an array of at most 6 issues, worst first, each {"severity":"high"|"medium"|"low","area":"...","screen":"screen name","where":"element","problem":"...","fix":"one concrete change"}. Use high only for issues that break the layout, the request or accessibility.`;

const REGRESSION_SYSTEM = `You compare desktop screenshots of a design BEFORE and AFTER a round of fixes. The fixes were made for other problems (often for mobile). Report only regressions: something that was right before and is worse after. Examples: edges that no longer line up (a list, its rules or a column against the content or the footer), a block that got narrower or wider than its neighbours, spacing that jumps, clipped or overlapping content, lost content.
- Ignore improvements and parts that did not change.
- Answer with JSON only: an array of at most 6 issues, each {"severity":"high"|"medium"|"low","area":"regression","screen":"screen name","where":"element","problem":"what got worse, before and after","fix":"one concrete change that keeps the fix and restores desktop"}. Answer [] when nothing got worse.`;

const APP_RULES = `<app-rules>
This run changed an existing app. Also check these, and file each problem as an issue:
- Placement ("area": "placement"): the new UI sits inside the section it belongs to, next to the content it relates to, not as a detached block at the top of the page or on the wrong page.
- No duplicated data ("area": "duplicate-content", high): the new UI does not repeat data the page already shows (for example a card that lists the same documents as the list right below it). Name the repeated items.
- Width and density ("area": "density"): it matches the width of the cards or columns next to it. When the request says compact, small or summary, it is compact: at most half the content width (about 400 to 600 px) or one grid column, with no large empty areas. A small element that spans the content width is high.
- The studio measures the page: a \`size-request\` or \`duplicate-data\` entry in <check-findings> is a measured fact. File each one as a high issue ("area": "density" or "duplicate-content"), repeat its width in px and % or the repeated items, and give one concrete fix that keeps the new element.
- Real components and tokens ("area": "components"): it uses the app's own components and token classes, not raw colors, inline styles or hand-made copies of existing components.
- Code ("area": "code", from <changed-source>): unused imports, hard-coded dates, IDs, names or strings that should come from props or the page's data, sample data where the page already has real data, and leftover code comments. Name the file and the line.
</app-rules>`;

export type CriticKind = 'full' | 'quick' | 'regression';

const SYSTEMS: Record<CriticKind, string> = { full: CRITIC_SYSTEM, quick: QUICK_SYSTEM, regression: REGRESSION_SYSTEM };

export interface CriticImage {
  label: string;
  data: string;
  key?: string;
  screen?: string;
  viewport?: 'desktop' | 'mobile';
  path?: string;
}

export interface ChangedSource {
  file: string;
  text: string;
}

interface CriticInput {
  request: string;
  findings: QualityFinding[];
  tasteRules: TasteRule[];
  designRules?: string[];
  images: CriticImage[];
  kind?: CriticKind;
  screens?: string;
  app?: boolean;
  changedSource?: ChangedSource[];
  before?: CriticImage[];
}

interface CriticResult {
  issues: CriticIssue[];
  costUsd: number;
  raw: string;
  error: string | null;
}

export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced?.[1] ?? text;
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error('no JSON in critic reply');
  const end = Math.max(body.lastIndexOf(']'), body.lastIndexOf('}'));
  return JSON.parse(body.slice(start, end + 1));
}

export function parseCriticReply(text: string): CriticIssue[] {
  return CriticReplySchema.parse(extractJson(text));
}

function findingLine(finding: QualityFinding): string {
  return `- [${finding.severity}] ${finding.check}${finding.viewport ? ` @${finding.viewport}` : ''}${finding.screen ? ` on "${finding.screen}"` : ''}: ${finding.message}`;
}

function criticFindings(findings: QualityFinding[]): QualityFinding[] {
  return findings.filter((finding) => finding.check !== 'visual-diff');
}

function sourceBlock(files: ChangedSource[] | undefined): string | null {
  if (!files?.length) return null;
  return `<changed-source>\n${files.map((file) => `--- ${file.file}\n${file.text}`).join('\n')}\n</changed-source>`;
}

function closingLine(input: Omit<CriticInput, 'images'>): string {
  if (input.kind === 'regression') return 'The images come in pairs per screen, desktop 1440 px: BEFORE, then AFTER. Reply with the JSON array only.';
  const before = input.before?.length ? ' The images marked BEFORE are desktop shots from the previous review, taken before the last fixes. Also file each regression ("area": "regression") where the current desktop shot is worse than its BEFORE shot.' : '';
  return `Each image label names its screen and size (desktop 1440 px, mobile 390 px).${before} Reply with the JSON array only.`;
}

export function criticText(input: Omit<CriticInput, 'images'>): string {
  const relevant = criticFindings(input.findings);
  const findings = relevant.length ? relevant.slice(0, 20).map(findingLine).join('\n') : '- none reported yet';
  const taste = input.tasteRules.length ? input.tasteRules.map((rule) => `- ${rule.kind} (${rule.area}): ${rule.rule}`).join('\n') : '- none';
  const blocks = [
    `<request>\n${input.request}\n</request>`,
    `<check-findings>\n${findings}\n</check-findings>`,
    `<taste>\n${taste}\n</taste>`,
    input.designRules?.length ? `<design-rules>\n${input.designRules.map((rule) => `- ${rule}`).join('\n')}\n</design-rules>` : null,
    input.screens ? `<screens>\n${input.screens}\n</screens>` : null,
    input.app && input.kind !== 'regression' ? APP_RULES : null,
    input.kind !== 'regression' ? sourceBlock(input.changedSource) : null,
    closingLine(input),
  ];
  return blocks.filter(Boolean).join('\n\n');
}

export function mediaType(base64: string): 'image/png' | 'image/jpeg' {
  return base64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
}

function imageBlocks(images: CriticImage[]) {
  return images.flatMap((image) => [
    { type: 'text' as const, text: image.label },
    { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType(image.data), data: image.data } },
  ]);
}

function criticPrompt(input: CriticInput): AsyncIterable<SDKUserMessage> {
  const content = [...imageBlocks(input.images), ...imageBlocks(input.before ?? []), { type: 'text' as const, text: criticText(input) }];
  const message: SDKUserMessage = { type: 'user', parent_tool_use_id: null, message: { role: 'user', content } };
  return (async function* single() {
    yield message;
  })();
}

function criticOptions(kind: CriticKind, model: string, budgetUsd: number | null, env?: Record<string, string | undefined>): Options {
  return {
    ...(env ? { env } : {}),
    model,
    ...(budgetUsd !== null ? { maxBudgetUsd: budgetUsd } : {}),
    maxTurns: 1,
    tools: [],
    settingSources: [],
    strictMcpConfig: true,
    mcpServers: {},
    persistSession: false,
    permissionMode: 'default',
    cwd: os.tmpdir(),
    systemPrompt: SYSTEMS[kind],
    settings: { disableBundledSkills: true, syncClaudeAiSkills: false, syncClaudeAiPlugins: false },
    skills: [],
  };
}

interface CriticStream {
  text: string;
  costUsd: number;
}

async function drain(stream: AsyncIterable<SDKMessage>): Promise<CriticStream> {
  let text = '';
  let costUsd = 0;
  for await (const message of stream) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) if (block.type === 'text') text += block.text;
    } else if (message.type === 'result') {
      costUsd = message.total_cost_usd ?? 0;
      if (message.subtype === 'success' && message.result) text = message.result;
    }
  }
  return { text, costUsd };
}

export async function runCritic(queryFn: QueryFn, input: CriticInput, model: string, budgetUsd: number | null, env?: Record<string, string | undefined>): Promise<CriticResult> {
  const stream = queryFn({ prompt: criticPrompt(input), options: criticOptions(input.kind ?? 'full', model, budgetUsd, env) });
  let drained: CriticStream = { text: '', costUsd: 0 };
  try {
    drained = await drain(stream);
    return { issues: parseCriticReply(drained.text), costUsd: drained.costUsd, raw: drained.text, error: null };
  } catch (error) {
    return { issues: [], costUsd: drained.costUsd, raw: drained.text, error: error instanceof Error ? error.message : String(error) };
  } finally {
    stream.close();
  }
}

type TilePlan = Record<'desktop' | 'mobile', { width: number; height: number; tileHeight: number; maxTiles: number }>;

function screenTitle(screen: RunScreen, index: number, total: number): string {
  if (total <= 1) return screen.label ? `Screen "${screen.label}"` : 'Screen 1';
  return `Screen ${index + 1} of ${total} "${screen.label}"${screen.forced ? ' (opened by the studio without its click path, so text that a script fills may be empty)' : ''}`;
}

async function viewportImages(preview: PreviewService, screen: RunScreen, title: string, name: 'desktop' | 'mobile', plan: TilePlan, outPrefix: string, fresh: boolean): Promise<CriticImage[]> {
  const tile = plan[name];
  const format = name === 'mobile' ? ('jpeg' as const) : ('png' as const);
  const tiles = await preview.screenshotTiles(screen.url, { viewport: { width: tile.width, height: tile.height }, tileHeight: tile.tileHeight, maxTiles: tile.maxTiles, from: 0, outPrefix: `${outPrefix}-${name}`, format, ...(fresh ? { fresh } : {}), ...(screen.prepare ? { prepare: screen.prepare } : {}) });
  return Promise.all(
    tiles.paths.map(async (file, index) => ({ label: `${title}, ${name} ${tile.width} px, image ${index + 1} of ${tiles.paths.length} (page height ${tiles.pageHeight}px)`, data: (await readFile(file)).toString('base64'), ...(screen.key ? { key: screen.key } : {}), screen: screen.label, viewport: name, path: file })),
  );
}

async function screenImages(preview: PreviewService, screen: RunScreen, title: string, plan: TilePlan, outPrefix: string, fresh: boolean): Promise<CriticImage[]> {
  const [desktop, mobile] = await Promise.all((['desktop', 'mobile'] as const).map((name) => viewportImages(preview, screen, title, name, plan, outPrefix, fresh)));
  return [...(desktop ?? []), ...(mobile ?? [])];
}

export async function criticImages(preview: PreviewService, screens: readonly RunScreen[], outPrefix: string, maxImages = 5, fresh = false): Promise<CriticImage[]> {
  const shown = screens.slice(0, Math.max(1, Math.floor(maxImages / 2)));
  if (shown.length <= 1) {
    const screen = shown[0];
    if (!screen) return [];
    const plan: TilePlan = { desktop: { ...CRITIC_TILES.desktop, maxTiles: Math.min(CRITIC_TILES.desktop.maxTiles, Math.max(1, maxImages - 2)) }, mobile: CRITIC_TILES.mobile };
    return screenImages(preview, screen, screenTitle(screen, 0, 1), plan, outPrefix, fresh);
  }
  const groups = await Promise.all(shown.map((screen, index) => screenImages(preview, screen, screenTitle(screen, index, shown.length), SCREEN_TILES, `${outPrefix}-s${index + 1}`, fresh)));
  return groups.flat();
}

export async function changedSourceFor(workTree: string, appDir: string, since: number | undefined): Promise<ChangedSource[]> {
  if (since === undefined) return [];
  const files = (await changedSince(workTree, appDir, since)).filter((file) => /\.(tsx?|jsx?)$/.test(file)).slice(0, CHANGED_FILES);
  const out: ChangedSource[] = [];
  let left = CHANGED_TOTAL_CHARS;
  for (const file of files) {
    if (left <= 0) break;
    const text = await readFile(path.join(workTree, file), 'utf8').catch(() => null);
    if (text === null) continue;
    const numbered = text.split('\n').map((line, index) => `${index + 1}| ${line}`).join('\n');
    const cut = numbered.slice(0, Math.min(CHANGED_FILE_CHARS, left));
    left -= cut.length;
    out.push({ file, text: cut.length < numbered.length ? `${cut}\n… (cut)` : cut });
  }
  return out;
}

function firstDesktop(images: readonly CriticImage[]): CriticImage[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    const key = image.key ?? image.screen ?? '';
    if (image.viewport !== 'desktop' || !image.path || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function changedPct(beforePath: string, afterPath: string): Promise<number> {
  const [before, after] = await Promise.all([readPng(beforePath), readPng(afterPath)]);
  return before.height === after.height ? diffImages(before, after, []).changedPct : 100;
}

export async function regressionPairs(preview: PreviewService, before: readonly CriticImage[], screens: readonly RunScreen[], outPrefix: string): Promise<{ before: CriticImage; after: CriticImage }[]> {
  const pairs: { before: CriticImage; after: CriticImage }[] = [];
  for (const [index, shot] of firstDesktop(before).entries()) {
    const screen = screens.find((candidate) => shot.key !== undefined && candidate.key === shot.key) ?? screens.find((candidate) => candidate.label === shot.screen) ?? (screens.length === 1 ? screens[0] : undefined);
    if (!screen || !shot.path) continue;
    const tile = SCREEN_TILES.desktop;
    const tileHeight = (await readPng(shot.path).catch(() => null))?.height ?? tile.tileHeight;
    const tiles = await preview.screenshotTiles(screen.url, { viewport: { width: tile.width, height: tile.height }, tileHeight, maxTiles: 1, from: 0, outPrefix: `${outPrefix}-s${index + 1}-desktop`, ...(screen.prepare ? { prepare: screen.prepare } : {}) });
    const afterPath = tiles.paths[0];
    if (!afterPath || (await changedPct(shot.path, afterPath).catch(() => 100)) < REGRESSION_MIN_PCT) continue;
    const name = shot.screen ?? screen.label;
    pairs.push({ before: { ...shot, label: `BEFORE: screen "${name}", desktop 1440 px` }, after: { label: `AFTER: screen "${name}", desktop 1440 px`, data: (await readFile(afterPath)).toString('base64'), screen: name, viewport: 'desktop', path: afterPath } });
  }
  return pairs;
}

export function beforeImages(before: readonly CriticImage[]): CriticImage[] {
  return firstDesktop(before).map((image) => ({ ...image, label: `BEFORE (previous review, before the last fixes): screen "${image.screen ?? ''}", desktop 1440 px` }));
}

export function describeCriticResult(result: CriticResult, state: Pick<RunToolState, 'criticCalls' | 'config'>): string {
  if (result.error) return `design_review could not parse the critic reply (${result.error}). Continue with your own checks.`;
  const high = result.issues.filter((issue) => issue.severity === 'high').length;
  const medium = result.issues.filter((issue) => issue.severity === 'medium').length;
  if (state.config.preset.quickCritic) return `${JSON.stringify(result.issues, null, 2)}\n\n${high} high, ${medium} medium. In your one fix loop, fix every high issue and the medium ones you can fix quickly with Edit, then run render_check again. This was the only design_review call of this run.`;
  const left = state.config.preset.criticMaxCalls - state.criticCalls;
  return `${JSON.stringify(result.issues, null, 2)}\n\n${high} high, ${medium} medium. Fix every high issue and most medium issues with Edit, then run render_check again. design_review calls left: ${left}.`;
}

export function criticOutPrefix(runsDir: string, runId: string, call: number | string): string {
  return path.join(runsDir, `${runId}-critic-${call}`);
}
