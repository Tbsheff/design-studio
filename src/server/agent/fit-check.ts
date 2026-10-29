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

function cardLabel(card: LayoutCard): string {
  const first = card.rows[0];
  return `${first ? `"${first}" ` : ''}(${card.name}, ${fmt(card.box.width)}x${fmt(card.box.height)} at ${card.box.x},${card.box.y})`;
}

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
    message: `The request asks for a ${word}, but the new element ${cardLabel(card)} is ${fmt(card.box.width)} px wide = ${Math.round(share * 100)}% of the ${fmt(content)} px page content width at 1440 px${tall}. A ${word} must take at most about ${fmt(limit)} px (half the content width).`,
    fix: `Make it at most about ${fmt(limit)} px wide: put it in one grid column beside an existing card (for example a md:grid-cols-2 row) or give it a max width such as max-w-md. Keep its content short.`,
  };
}

const GENERIC_WORDS = new Set(
  'a an and the of to in on for with at by from this that these those it its my our your here there new add show make create put build design small compact tiny mini little narrow minimal slim card cards widget widgets panel panels tile tiles box boxes section sections block blocks module modules summary summaries list lists banner banners component components callout callouts recent latest page screen view data info item items top bottom below above side'.split(' '),
);
const ACTION_ROW = /^(view|open|see|show|upload|add|go|more|all|download|edit|new|create|manage)\b(?:\W+\w+){0,2}\W*$/i;

function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function namesContent(request: string, card: LayoutCard, repeated: readonly string[], baseline: LayoutRegion): boolean {
  const asked = new Set(words(request).filter((word) => word.length >= 3 && !GENERIC_WORDS.has(word)));
  if (asked.size === 0) return false;
  const hits = (rows: readonly string[]) => new Set(rows.flatMap(words).filter((word) => asked.has(word)));
  if (hits(repeated).size > 0) return true;
  const onPage = hits(baseline.rows ?? []);
  return [...hits(card.rows.slice(0, 1))].some((word) => onPage.has(word));
}

function addsSomething(card: LayoutCard, baseline: LayoutRegion): boolean {
  const base = counts(baseline.rows ?? []);
  return card.rows.slice(1).some((row) => meaningful(row) && !base.has(row) && !ACTION_ROW.test(row.trim()));
}

function duplicateFinding(card: LayoutCard, repeated: string[], baseline: LayoutRegion, request: string): QualityFinding | null {
  const enough = repeated.length >= 2 || (repeated.length === 1 && card.rows.filter(meaningful).length <= 2);
  if (!enough) return null;
  const named = namesContent(request, card, repeated, baseline);
  if (named && addsSomething(card, baseline)) return null;
  const listed = repeated.slice(0, LISTED).map((row) => `"${row}"`).join(', ');
  const more = repeated.length > LISTED ? ` and ${repeated.length - LISTED} more` : '';
  const base = { check: 'duplicate-data' as const, viewport: 'desktop' as const, selector: card.name, source: null };
  if (named) {
    return {
      ...base,
      severity: 'medium',
      message: `The request names this content, so the new element ${cardLabel(card)} must keep it. But it only repeats what the page already shows (${listed}${more}) and adds nothing new.`,
      fix: 'Keep the items the request asks for. Make the element a compact summary of them that adds what the page does not show yet: for example the latest 3 items with date and status, a count, or who signed. Do not replace the items with only a count or a button.',
    };
  }
  return {
    ...base,
    severity: 'high',
    message: `The new element ${cardLabel(card)} repeats ${repeated.length} item(s) the page already shows elsewhere: ${listed}${more}. The same data shows twice on one screen.`,
    fix: 'Do not list the same items again. Show facts the page does not show yet (for example a count, the latest date, a status summary) or link to the existing list. Keep the new element.',
  };
}

export function fitFindings(baseline: LayoutRegion | null, now: LayoutRegion | null, request: string): QualityFinding[] {
  if (!baseline?.rows || !now?.rows) return [];
  const card = newCard(baseline, now);
  if (!card) return [];
  const word = sizeWord(request);
  const size = word ? sizeFinding(card, now, word) : null;
  const dup = duplicateFinding(card, repeatedRows(card, baseline, now), baseline, request);
  return [size, dup].filter((finding): finding is QualityFinding => finding !== null);
}

export function regionFindings(baseline: LayoutRegion | null, now: LayoutRegion | null, owner: PageOwner | null | undefined, request: string): QualityFinding[] {
  return [...outsideFindings(baseline, now, owner), ...fitFindings(baseline, now, request)];
}
