import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CoverageEntry, DesignSystemCoverage } from '../../shared/contracts.js';
import { TOKENS_FILE } from '../../shared/contracts.js';
import { isNodeError } from '../store/errors.js';
import { COVERAGE_FILE, META_FILE } from './extract/draft.js';
import { gradeOf, scoreOf } from './extract/map.js';
import { writeFileAtomic, type PackRegistry } from './packs.js';

const SAFE_ATTACHMENT_ID = /^[A-Za-z0-9_-]{1,64}$/;

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as unknown;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function readCoverage(workTree: string): Promise<DesignSystemCoverage | null> {
  const parsed = (await readJson(path.join(workTree, COVERAGE_FILE))) as DesignSystemCoverage | null;
  return parsed && parsed.version === 1 && Array.isArray(parsed.tokens) ? parsed : null;
}

export async function draftAttachmentIds(workTree: string, exists: (id: string) => Promise<boolean>): Promise<string[]> {
  const meta = (await readJson(path.join(workTree, META_FILE))) as { attachments?: unknown } | null;
  const listed = Array.isArray(meta?.attachments) ? meta.attachments : [];
  const ids = listed.map((item) => (item && typeof item === 'object' ? (item as { id?: unknown }).id : null)).filter((id): id is string => typeof id === 'string' && SAFE_ATTACHMENT_ID.test(id));
  const known = await Promise.all([...new Set(ids)].map(async (id) => ((await exists(id)) ? id : null)));
  return known.filter((id): id is string => id !== null);
}

interface TokenNode {
  $value?: unknown;
  $extensions?: { 'studio.modes'?: { dark?: unknown } };
}

function nodeAt(tokens: unknown, token: string): TokenNode | null {
  const [group, name] = token.split('.');
  const groupNode = (tokens as Record<string, unknown> | null)?.[group ?? ''];
  const node = typeof groupNode === 'object' && groupNode !== null ? (groupNode as Record<string, unknown>)[name ?? ''] : null;
  return typeof node === 'object' && node !== null ? (node as TokenNode) : null;
}

function valuesOf(node: TokenNode | null, flattenDark: boolean): string {
  if (!node) return '';
  const dark = node.$extensions?.['studio.modes']?.dark;
  if (flattenDark) return JSON.stringify([dark ?? node.$value]);
  return JSON.stringify([node.$value, dark ?? null]);
}

const AGENT_EVIDENCE = 'changed by an Improve with AI run';

export function updateCoverage(coverage: DesignSystemCoverage, tokens: unknown, baseTokens: unknown, baseMode: 'light' | 'dark'): DesignSystemCoverage {
  const flattenDark = coverage.mode === 'dark' && baseMode === 'light';
  const entries: CoverageEntry[] = coverage.tokens.map((entry) => {
    if (entry.confidence !== 'fallback') return entry;
    const now = nodeAt(tokens, entry.token);
    const base = nodeAt(baseTokens, entry.token);
    const current = flattenDark ? JSON.stringify([now?.$value]) : valuesOf(now, false);
    if (!now || current === valuesOf(base, flattenDark)) return entry;
    return { token: entry.token, source: 'agent', confidence: 'medium', evidence: AGENT_EVIDENCE };
  });
  const score = scoreOf(entries);
  return { ...coverage, score, grade: gradeOf(score), tokens: entries, fallbacks: entries.filter((entry) => entry.confidence === 'fallback').map((entry) => entry.token) };
}

export async function refreshDraftCoverage(workTree: string, registry: PackRegistry): Promise<DesignSystemCoverage | null> {
  const coverage = await readCoverage(workTree);
  if (!coverage) return null;
  const base = await registry.get(coverage.basePackId);
  const tokens = await readJson(path.join(workTree, TOKENS_FILE));
  if (!base || !tokens) return coverage;
  const next = updateCoverage(coverage, tokens, base.tokens, base.manifest.mode);
  if (JSON.stringify(next) !== JSON.stringify(coverage)) await writeFileAtomic(path.join(workTree, COVERAGE_FILE), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}
