import { readFileSync, statSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ToolDiff } from '../../shared/contracts.js';
import { diffLines } from '../../shared/line-diff.js';
import { isExecutedConfigFile, isSecretFile } from './permissions.js';

export const DIFF_MAX_BYTES = 1_000_000;
const QUIET_MS = 150;
const MAX_WAIT_MS = 1500;
const MAX_PATHS = 60;
const GUARD_SCAN_DEPTH = 12;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '.turbo', '.vite', '.studio', 'vite-cache']);

export type FileText = { kind: 'missing' } | { kind: 'text'; text: string } | { kind: 'skip' };

export function textOf(bytes: Uint8Array | null): FileText {
  if (bytes === null) return { kind: 'missing' };
  if (bytes.byteLength > DIFF_MAX_BYTES) return { kind: 'skip' };
  const text = Buffer.from(bytes).toString('utf8');
  return text.includes('\u0000') ? { kind: 'skip' } : { kind: 'text', text };
}

export function readFileText(file: string): FileText {
  try {
    if (statSync(file).size > DIFF_MAX_BYTES) return { kind: 'skip' };
    return textOf(readFileSync(file));
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? { kind: 'missing' } : { kind: 'skip' };
  }
}

function readBytes(file: string): Uint8Array | null {
  try {
    return statSync(file).isFile() ? readFileSync(file) : null;
  } catch {
    return null;
  }
}

export function fileDiff(relative: string, before: FileText, after: FileText): ToolDiff | null {
  if (before.kind === 'skip' || after.kind === 'skip') return null;
  const old = before.kind === 'text' ? before.text : '';
  const next = after.kind === 'text' ? after.text : '';
  return { path: relative, created: before.kind === 'missing', ...diffLines(old, next) };
}

export type BashWriteCheck = (relative: string) => string | null;

export interface BashEditResult {
  diffs: ToolDiff[];
  reverted: string[];
  message: string | null;
}

export interface BashEditDeps {
  workTree: string;
  subscribe(listener: (paths: string[]) => void): () => void;
  headFile(relative: string): Promise<Uint8Array | null>;
}

interface Watch {
  paths: Set<string>;
  lastEventAt: number;
  stop: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGuardedName(file: string): boolean {
  return isSecretFile(file) || isExecutedConfigFile(file);
}

async function scanGuarded(root: string, dir: string, depth: number, found: Map<string, Uint8Array>): Promise<void> {
  const items = await readdir(dir, { withFileTypes: true }).catch(() => []);
  await Promise.all(
    items.map(async (item) => {
      const target = path.join(dir, item.name);
      if (item.isDirectory() && depth < GUARD_SCAN_DEPTH && !SKIP_DIRS.has(item.name)) return scanGuarded(root, target, depth + 1, found);
      if (!item.isFile() || !isGuardedName(item.name)) return;
      const bytes = await readFile(target).catch(() => null);
      if (bytes) found.set(path.relative(root, target).split(path.sep).join('/'), bytes);
    }),
  );
}

function sameBytes(a: Uint8Array | null, b: Uint8Array | null): boolean {
  if (a === null || b === null) return a === b;
  return Buffer.from(a).equals(Buffer.from(b));
}

function revertMessage(problems: Map<string, string>): string | null {
  if (problems.size === 0) return null;
  const lines = [...problems].map(([file, problem]) => `- ${file}: ${problem}`);
  return `Design Studio undid this command's changes to ${problems.size === 1 ? 'this file' : 'these files'}:\n${lines.join('\n')}`;
}

function isInside(relative: string): boolean {
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function createBashEditTracker(deps: BashEditDeps) {
  const root = path.resolve(deps.workTree);
  const known = new Map<string, Uint8Array | null>();
  const watches = new Map<string, Watch>();
  let guarded: Promise<Map<string, Uint8Array>> | null = null;

  const guardedSnapshot = (): Promise<Map<string, Uint8Array>> => {
    guarded ??= (async () => {
      const found = new Map<string, Uint8Array>();
      await scanGuarded(root, root, 0, found);
      return found;
    })();
    return guarded;
  };

  async function putBack(relative: string, bytes: Uint8Array | null): Promise<void> {
    const absolute = path.join(root, relative);
    if (bytes === null) {
      await rm(absolute, { force: true });
      return;
    }
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes);
  }

  async function before(relative: string): Promise<Uint8Array | null> {
    if (known.has(relative)) return known.get(relative) ?? null;
    if (isGuardedName(relative)) return (await guardedSnapshot()).get(relative) ?? null;
    return deps.headFile(relative);
  }

  async function settle(watch: Watch): Promise<void> {
    const startedAt = Date.now();
    for (;;) {
      const now = Date.now();
      if (now - startedAt >= MAX_WAIT_MS) return;
      const quietFor = now - Math.max(watch.lastEventAt, startedAt);
      if (quietFor >= QUIET_MS) return;
      await sleep(QUIET_MS - quietFor);
    }
  }

  async function inspect(relative: string, check: BashWriteCheck, problems: Map<string, string>, diffs: ToolDiff[]): Promise<void> {
    const after = readBytes(path.join(root, relative));
    const old = await before(relative);
    if (sameBytes(old, after)) return;
    const problem = check(relative);
    if (problem) {
      await putBack(relative, old);
      problems.set(relative, problem);
      return;
    }
    known.set(relative, after);
    const diff = fileDiff(relative, textOf(old), textOf(after));
    if (diff && (diff.added > 0 || diff.removed > 0 || diff.created || after === null)) diffs.push(diff);
  }

  return {
    prepare(): void {
      void guardedSnapshot();
    },

    close(): void {
      for (const watch of watches.values()) watch.stop();
      watches.clear();
    },

    remember(relative: string): void {
      known.set(relative, readBytes(path.join(root, relative)));
    },

    async start(toolUseId: string): Promise<void> {
      await guardedSnapshot();
      const watch: Watch = { paths: new Set(), lastEventAt: 0, stop: () => undefined };
      watch.stop = deps.subscribe((paths) => {
        for (const entry of paths) watch.paths.add(entry);
        watch.lastEventAt = Date.now();
      });
      watches.get(toolUseId)?.stop();
      watches.set(toolUseId, watch);
    },

    async finish(toolUseId: string, check: BashWriteCheck): Promise<BashEditResult> {
      const watch = watches.get(toolUseId);
      if (!watch) return { diffs: [], reverted: [], message: null };
      await settle(watch);
      watch.stop();
      watches.delete(toolUseId);
      const problems = new Map<string, string>();
      const diffs: ToolDiff[] = [];
      const paths = [...watch.paths].filter(isInside).sort().slice(0, MAX_PATHS);
      for (const relative of paths) await inspect(relative, check, problems, diffs);
      return { diffs, reverted: [...problems.keys()], message: revertMessage(problems) };
    },
  };
}

export type BashEditTracker = ReturnType<typeof createBashEditTracker>;
