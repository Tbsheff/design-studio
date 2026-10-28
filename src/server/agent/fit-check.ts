import type { QualityFinding } from '../../shared/contracts.js';
import { outsideFindings, type LayoutCard, type LayoutRegion, type PageOwner } from './layout-region.js';

const SIZE_WORDS = /\b(small|compact|tiny|mini|little|narrow|minimal|slim)\b(?:\W+\w+){0,5}?\W+(cards?|widgets?|panels?|tiles?|box(?:es)?|sections?|blocks?|modules?|summary|summaries|lists?|banners?|components?|callouts?)\b/i;
const MAX_WIDTH_SHARE = 0.5;
const MAX_HEIGHT_PX = 450;
const SAME_CARD = 0.6;
const MIN_DUP_CHARS = 6;
const LISTED = 4;

export function sizeWord(request: string): string | null {
  const match = SIZE_WORDS.exec(request);
  return match ? `${match[1]?.toLowerCase()} ${match[2]?.toLowerCase()}` : null;
}

function counts(rows: readonly string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) map.set(row, (map.get(row) ?? 0) + 1);
  return map;
}

function overlap(a: readonly string[], b: readonly string[]): number {
  const other = new Set(b);
  const shared = new Set(a.filter((row) => other.has(row))).size;
  return shared / Math.max(1, new Set([...a, ...b]).size);
}

function newRows(card: LayoutCard, base: Map<string, number>): number {
  return card.rows.filter((row) => !base.has(row)).length;
}

export function newCard(baseline: LayoutRegion, now: LayoutRegion): LayoutCard | null {
  const base = counts(baseline.rows ?? []);
  const old = baseline.cards ?? [];
  const fresh = (now.cards ?? []).filter((card) => newRows(card, base) > 0 && !old.some((prior) => overlap(prior.rows, card.rows) >= SAME_CARD));
  const area = (card: LayoutCard) => card.box.width * card.box.height;
  fresh.sort((a, b) => newRows(b, base) - newRows(a, base) || area(a) - area(b));
  return fresh[0] ?? null;
}

function meaningful(row: string): boolean {
  return row.length >= MIN_DUP_CHARS && /\p{L}/u.test(row);
}

export function repeatedRows(card: LayoutCard, baseline: LayoutRegion, now: LayoutRegion): string[] {
  const base = counts(baseline.rows ?? []);
  const all = counts(now.rows ?? []);
  const mine = counts(card.rows);
  return [...mine.keys()].filter((row) => meaningful(row) && base.has(row) && (all.get(row) ?? 0) > (mine.get(row) ?? 0));
}

const fmt = (value: number) => value.toLocaleString('en-US');

function sizeFinding(card: LayoutCard, now: LayoutRegion, word: string): QualityFinding | null {
  const content = now.contentWidth ?? now.columnBox?.width ?? now.mainBox.width;
  if (content <= 0) return null;
  const share = card.box.width / content;
  const limit = Math.round(content * MAX_WIDTH_SHARE);
  if (share <= MAX_WIDTH_SHARE && card.box.height <= MAX_HEIGHT_PX) return null;
  const tall = card.box.height > MAX_HEIGHT_PX ? ` and ${fmt(card.box.height)} px tall (more than ${MAX_HEIGHT_PX} px)` : ` (height ${fmt(card.box.height)} px)`;
  return {
    check: 'size-request',
    severity: 'high',
    viewport: 'desktop',
    selector: card.name,
    source: null,
    message: `The request asks for a ${word}, but the new element ${card.name} is ${fmt(card.box.width)} px wide = ${Math.round(share * 100)}% of the ${fmt(content)} px page content width at 1440 px${tall}. A ${word} must take at most about ${fmt(limit)} px (half the content width).`,
    fix: `Make it at most about ${fmt(limit)} px wide: put it in one grid column beside an existing card (for example a md:grid-cols-2 row) or give it a max width such as max-w-md. Keep its content short.`,
  };
}

function duplicateFinding(card: LayoutCard, repeated: string[]): QualityFinding | null {
  const enough = repeated.length >= 2 || (repeated.length === 1 && card.rows.filter(meaningful).length <= 2);
  if (!enough) return null;
  const listed = repeated.slice(0, LISTED).map((row) => `"${row}"`).join(', ');
  const more = repeated.length > LISTED ? ` and ${repeated.length - LISTED} more` : '';
  return {
    check: 'duplicate-data',
    severity: 'high',
    viewport: 'desktop',
    selector: card.name,
    source: null,
    message: `The new element ${card.name} repeats ${repeated.length} item(s) the page already shows elsewhere: ${listed}${more}. The same data shows twice on one screen.`,
    fix: 'Do not list the same items again. Show facts the page does not show yet (for example a count, the latest date, a status summary) or link to the existing list. Keep the new element.',
  };
}

export function fitFindings(baseline: LayoutRegion | null, now: LayoutRegion | null, request: string): QualityFinding[] {
  if (!baseline?.rows || !now?.rows) return [];
  const card = newCard(baseline, now);
  if (!card) return [];
  const word = sizeWord(request);
  const size = word ? sizeFinding(card, now, word) : null;
  const dup = duplicateFinding(card, repeatedRows(card, baseline, now));
  return [size, dup].filter((finding): finding is QualityFinding => finding !== null);
}

export function regionFindings(baseline: LayoutRegion | null, now: LayoutRegion | null, owner: PageOwner | null | undefined, request: string): QualityFinding[] {
  return [...outsideFindings(baseline, now, owner), ...fitFindings(baseline, now, request)];
}
