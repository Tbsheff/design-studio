import type { CompiledTokenEntry, Direction, Project } from '../../shared/contracts.js';
import { locKey, matchesOf, summarizeHits, unlocatedCount, type StyleHit, type StyleMatch, type StyleQuery, type StyleScanResult, type StyleValueRow, type TokenLookup } from '../../shared/style-search.js';
import { hexOf } from '../../shared/color-near.js';
import { tokenFieldState } from '../../shared/token-match.js';
import { readDesignSystemState } from '../design-system/state.js';
import { waitForPage } from '../export/capture.js';
import type { PreviewService } from '../types.js';

const HEADLESS_SCAN = 'window.__studioStyleScan';
const ROWS_MAX = 60;
const MATCHES_MAX = 200;

export interface PageViewport {
  width: number;
  height: number;
}

export async function scanPageStyles(preview: PreviewService, url: string, viewport: PageViewport, query: StyleQuery): Promise<StyleScanResult> {
  if (!preview.withPage) throw new Error('rendering is not available');
  return preview.withPage(url, viewport, async (page) => {
    await waitForPage(page);
    const ready = await page.evaluate<boolean>(`typeof ${HEADLESS_SCAN} === 'function'`);
    if (!ready) throw new Error('This page has no studio bridge script, so its styles cannot be scanned');
    return page.evaluate<StyleScanResult>(`${HEADLESS_SCAN}(${JSON.stringify(query)})`);
  });
}

export function tokenLookupFor(entries: CompiledTokenEntry[]): TokenLookup | null {
  if (entries.length === 0) return null;
  return (property, value) => {
    const state = tokenFieldState(property, value, entries);
    return state.kind === 'token' ? state.match.cssVar : null;
  };
}

export async function tokenEntriesFor(project: Project, direction: Direction): Promise<CompiledTokenEntry[]> {
  return readDesignSystemState(project, direction)
    .then((state) => state.entries)
    .catch(() => []);
}

export interface StyleReport {
  value: string | null;
  elements: number;
  truncated: boolean;
  values: StyleValueRow[];
  matches: StyleMatch[];
  sites: number;
  unlocated: number;
}

function siteCount(hits: StyleHit[]): number {
  return new Set(hits.flatMap((hit) => (hit.source ? [locKey(hit.source)] : []))).size;
}

function withHex(row: StyleValueRow): StyleValueRow {
  const hex = row.kind === 'color' ? hexOf(row.value) : null;
  return hex && hex !== row.value ? { ...row, hex } : row;
}

export function styleReport(result: StyleScanResult, lookup: TokenLookup | null): StyleReport {
  const values = summarizeHits(result.hits, lookup).map(withHex);
  return {
    value: result.value,
    elements: result.elements,
    truncated: result.truncated,
    values: values.slice(0, ROWS_MAX),
    matches: result.value !== null ? matchesOf(result.hits).slice(0, MATCHES_MAX) : [],
    sites: siteCount(result.hits),
    unlocated: unlocatedCount(result.hits),
  };
}
