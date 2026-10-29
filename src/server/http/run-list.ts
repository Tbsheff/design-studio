import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { RunSummary } from '../../shared/contracts.js';
import { BadRequestError } from '../store/errors.js';

interface CachedRun {
  mtimeMs: number;
  size: number;
  summary: RunSummary | null;
}

export interface RunListQuery {
  limit: number | null;
  before: number | null;
  light: boolean;
}

export interface RunPage {
  runs: RunSummary[];
  nextBefore: number | null;
}

const LIMIT_MAX = 200;
const CACHE_MAX = 2000;
const cache = new Map<string, CachedRun>();

export function isRunSummary(value: unknown): value is RunSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Partial<RunSummary>;
  return typeof record.id === 'string' && typeof record.status === 'string' && typeof record.request === 'object' && record.request !== null;
}

async function readRun(file: string): Promise<RunSummary | null> {
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return null;
  const known = cache.get(file);
  if (known && known.mtimeMs === info.mtimeMs && known.size === info.size) return known.summary;
  let summary: RunSummary | null = null;
  try {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
    summary = isRunSummary(parsed) ? parsed : null;
  } catch {
    summary = null;
  }
  if (cache.size > CACHE_MAX) cache.clear();
  cache.set(file, { mtimeMs: info.mtimeMs, size: info.size, summary });
  return summary;
}

export async function listRunSummaries(dir: string): Promise<RunSummary[]> {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json') && !name.startsWith('session-'));
  const runs = await Promise.all(names.map((name) => readRun(path.join(dir, name))));
  return runs.filter((run): run is RunSummary => run !== null).sort((a, b) => b.startedAt - a.startedAt);
}

function whole(raw: string | undefined, name: string): number | null {
  if (raw === undefined || raw === '') return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new BadRequestError(`${name} must be a whole number`);
  return value;
}

export function runListQuery(query: (name: string) => string | undefined): RunListQuery {
  const limit = whole(query('limit'), 'limit');
  return { limit: limit === null ? null : Math.min(Math.max(limit, 1), LIMIT_MAX), before: whole(query('before'), 'before'), light: query('light') === '1' };
}

function lightRun(run: RunSummary): RunSummary {
  const { parts: _parts, todos: _todos, loop: _loop, designSystemCheck: _ds, finalCheck: _check, ...rest } = run;
  return { ...rest, toolCalls: [], finalText: run.finalText.slice(0, 400) };
}

export function runListBody(all: RunSummary[], query: RunListQuery): RunSummary[] | RunPage {
  if (query.limit === null && query.before === null && !query.light) return all;
  const after = query.before === null ? all : all.filter((run) => run.startedAt < (query.before as number));
  const page = query.limit === null ? after : after.slice(0, query.limit);
  const last = page[page.length - 1];
  const runs = query.light ? page.map(lightRun) : page;
  return { runs, nextBefore: last && page.length < after.length ? last.startedAt : null };
}
