import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceMapConsumer, type RawSourceMap } from 'source-map-js';

export interface SourceTarget {
  upstream: string;
  workTree: string;
  appDir: string;
}

interface StackFrame {
  file: string;
  methodName: string;
  line1: number;
  column1: number;
}

interface OriginalFrame {
  file?: string | null;
  line1?: number | null;
  column1?: number | null;
  ignored?: boolean;
}

type FrameResult = { status: 'fulfilled'; value: { originalStackFrame?: OriginalFrame | null } | null } | { status: 'rejected'; reason?: unknown };

const FRAME_LINE = /^\s*at (?:async )?(?:(.*?) \()?(.+?):(\d+):(\d+)\)?\s*$/;
const MAX_FRAMES_PER_STACK = 10;
const MAX_STACK_LENGTH = 16 * 1024;
const CACHE_LIMIT = 5000;
const SOURCE_EXT = /\.(tsx|ts|jsx|js|mjs|cjs|mdx)$/;
const cache = new Map<string, string | null>();
const MAP_TTL_MS = 30_000;
const STALE_MAP_RETRY_MS = 1500;
const MAX_MAPS = 200;
const chunkMaps = new Map<string, { consumer: Promise<SourceMapConsumer | null>; at: number }>();
const lineCounts = new Map<string, number>();

export function parseStack(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  for (const line of stack.slice(0, MAX_STACK_LENGTH).split('\n')) {
    const match = FRAME_LINE.exec(line);
    if (!match?.[2]) continue;
    frames.push({ file: match[2], methodName: match[1] ?? '<unknown>', line1: Number(match[3]), column1: Number(match[4]) });
    if (frames.length >= MAX_FRAMES_PER_STACK) break;
  }
  return frames;
}

function isServerFrame(file: string): boolean {
  return file.startsWith('rsc://') || file.startsWith('about://React/') || file.startsWith('file://') || file.startsWith('/');
}

function toUpstream(file: string, previewOrigin: string, upstream: string): string {
  return file.startsWith(previewOrigin) ? upstream + file.slice(previewOrigin.length) : file;
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function workTreeRelative(target: SourceTarget, raw: string): string | null {
  let file = raw.split('?')[0] ?? raw;
  if (file.startsWith('file://')) {
    try {
      file = fileURLToPath(file);
    } catch {
      return null;
    }
  }
  if (file.includes('node_modules') || file.startsWith('[turbopack]') || file.startsWith('webpack-internal:') || !SOURCE_EXT.test(file)) return null;
  const root = realpathSync(target.workTree);
  const appRoot = path.join(root, target.appDir);
  const candidates = path.isAbsolute(file)
    ? [file]
    : file.startsWith('[project]/')
      ? [path.join(root, file.slice('[project]/'.length)), path.join(appRoot, file.slice('[project]/'.length))]
      : [path.resolve(appRoot, file), path.resolve(root, file)];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const real = realpathSync(candidate);
    if (!isInside(root, real)) continue;
    const relative = path.relative(root, real).split(path.sep);
    if (relative.includes('node_modules') || relative.includes('.git') || relative.includes('.next')) continue;
    return relative.join('/');
  }
  return null;
}

async function serverFrames(target: SourceTarget, frames: StackFrame[]): Promise<(OriginalFrame | null)[]> {
  if (frames.length === 0) return [];
  const response = await fetch(new URL('/__nextjs_original-stack-frames', target.upstream), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ frames: frames.map((frame) => ({ ...frame, arguments: [] })), isServer: true, isEdgeServer: false, isAppDirectory: true }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`original stack frames: ${response.status}`);
  const results = (await response.json()) as FrameResult[];
  return frames.map((_, index) => {
    const result = results[index];
    return result?.status === 'fulfilled' ? (result.value?.originalStackFrame ?? null) : null;
  });
}

async function loadChunkMap(chunkUrl: string): Promise<SourceMapConsumer | null> {
  const response = await fetch(`${chunkUrl.split('?')[0]}.map`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return null;
  return new SourceMapConsumer((await response.json()) as RawSourceMap);
}

function chunkMap(chunkUrl: string): Promise<SourceMapConsumer | null> {
  const cached = chunkMaps.get(chunkUrl);
  if (cached && Date.now() - cached.at < MAP_TTL_MS) return cached.consumer;
  if (chunkMaps.size >= MAX_MAPS) chunkMaps.delete(chunkMaps.keys().next().value as string);
  const consumer = loadChunkMap(chunkUrl).catch(() => null);
  chunkMaps.set(chunkUrl, { consumer, at: Date.now() });
  return consumer;
}

async function clientFrames(frames: StackFrame[]): Promise<(OriginalFrame | null)[]> {
  return Promise.all(
    frames.map(async (frame) => {
      if (!/^https?:\/\//.test(frame.file)) return null;
      const consumer = await chunkMap(frame.file);
      const position = consumer?.originalPositionFor({ line: frame.line1, column: frame.column1 - 1 });
      if (!position?.source || position.line === null) return null;
      return { file: position.source, line1: position.line, column1: (position.column ?? 0) + 1, ignored: position.source.includes('node_modules') };
    }),
  );
}

function originalFrames(target: SourceTarget, frames: StackFrame[], isServer: boolean): Promise<(OriginalFrame | null)[]> {
  return isServer ? serverFrames(target, frames) : clientFrames(frames);
}

function keyOf(frame: StackFrame): string {
  return `${frame.file}:${frame.line1}:${frame.column1}`;
}

function remember(key: string, value: string | null): void {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
}

function countLines(file: string): number | null {
  try {
    return readFileSync(file, 'utf8').split('\n').length;
  } catch {
    return null;
  }
}

function rememberLines(target: SourceTarget, relative: string): void {
  const key = path.join(target.workTree, relative);
  if (lineCounts.has(key)) return;
  const count = countLines(key);
  if (count !== null) lineCounts.set(key, count);
}

export function sourcesShifted(upstream: string, root: string, paths: string[]): boolean {
  let shifted = false;
  for (const relative of paths) {
    const key = path.join(root, relative);
    const before = lineCounts.get(key);
    if (before === undefined) continue;
    const after = countLines(key);
    if (after === before) continue;
    if (after === null) lineCounts.delete(key);
    else lineCounts.set(key, after);
    shifted = true;
  }
  if (!shifted) return false;
  forgetUpstream(upstream);
  return true;
}

async function lookUpStackSources(target: SourceTarget, stacks: string[], previewOrigin: string): Promise<(string | null)[]> {
  const parsed = stacks.map((stack) => parseStack(stack).map((frame) => ({ ...frame, file: toUpstream(frame.file, previewOrigin, target.upstream) })));
  const unknown = new Map<string, StackFrame>();
  for (const frames of parsed) for (const frame of frames) if (!cache.has(`${target.upstream}|${keyOf(frame)}`)) unknown.set(keyOf(frame), frame);
  const pending = [...unknown.values()];
  const groups = [pending.filter((frame) => !isServerFrame(frame.file)), pending.filter((frame) => isServerFrame(frame.file))];
  await Promise.all(
    groups.map(async (group, index) => {
      const originals = await originalFrames(target, group, index === 1).catch(() => null);
      if (!originals) return;
      group.forEach((frame, at) => {
        const original = originals[at];
        const file = original && !original.ignored && original.file ? workTreeRelative(target, original.file) : null;
        const line = original?.line1 ?? null;
        const col = original?.column1 ?? null;
        if (file) rememberLines(target, file);
        remember(`${target.upstream}|${keyOf(frame)}`, file && line ? `${file}:${line}:${col ?? 1}` : null);
      });
    }),
  );
  return parsed.map((frames) => {
    for (const frame of frames) {
      const found = cache.get(`${target.upstream}|${keyOf(frame)}`);
      if (found) return found;
    }
    return null;
  });
}

function opensElement(target: SourceTarget, source: string): boolean {
  const match = /^(.*):(\d+):(\d+)$/.exec(source);
  if (!match) return false;
  try {
    const line = readFileSync(path.join(target.workTree, match[1] ?? ''), 'utf8').split('\n')[Number(match[2]) - 1];
    return line?.[Number(match[3]) - 1] === '<';
  } catch {
    return false;
  }
}

function forgetUpstream(upstream: string): void {
  for (const key of cache.keys()) if (key.startsWith(`${upstream}|`)) cache.delete(key);
  for (const url of chunkMaps.keys()) if (url.startsWith(upstream)) chunkMaps.delete(url);
}

export async function resolveStackSources(target: SourceTarget, stacks: string[], previewOrigin: string): Promise<(string | null)[]> {
  const first = await lookUpStackSources(target, stacks, previewOrigin);
  if (first.every((source) => source === null || opensElement(target, source))) return first;
  forgetUpstream(target.upstream);
  await new Promise((resolve) => setTimeout(resolve, STALE_MAP_RETRY_MS));
  const second = await lookUpStackSources(target, stacks, previewOrigin);
  return second.map((source) => (source && opensElement(target, source) ? source : null));
}
