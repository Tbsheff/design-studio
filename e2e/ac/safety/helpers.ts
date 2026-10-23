import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { ROOT } from '../../support/server';

const RESULTS_DIR = path.join(ROOT, 'verification', 'ac-safety-evidence');

export function saveResult(name: string, data: unknown): string {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const file = path.join(RESULTS_DIR, `${name}.json`);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}

export function treeHash(root: string, skip: (relative: string) => boolean = () => false): { hash: string; files: Map<string, string> } {
  const files = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const relative = path.relative(root, full);
      if (skip(relative)) continue;
      const info = lstatSync(full);
      if (info.isSymbolicLink()) files.set(relative, `link:${readlinkSync(full)}`);
      else if (info.isDirectory()) {
        files.set(`${relative}/`, `dir:${info.mode}`);
        walk(full);
      } else files.set(relative, `${info.mode}:${createHash('sha256').update(readFileSync(full)).digest('hex')}`);
    }
  };
  if (existsSync(root)) walk(root);
  const hash = createHash('sha256');
  for (const [key, value] of [...files.entries()].sort()) hash.update(`${key}\0${value}\n`);
  return { hash: hash.digest('hex'), files };
}

export function diffTrees(before: Map<string, string>, after: Map<string, string>): { added: string[]; removed: string[]; changed: string[] } {
  const added = [...after.keys()].filter((key) => !before.has(key));
  const removed = [...before.keys()].filter((key) => !after.has(key));
  const changed = [...after.keys()].filter((key) => before.has(key) && before.get(key) !== after.get(key));
  return { added, removed, changed };
}

export function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)] ?? NaN;
}

export function p50(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.5 * sorted.length) - 1)] ?? NaN;
}

export async function frameByUrl(page: Page, fragment: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const frame = page.frames().find((candidate) => candidate.url().includes(fragment));
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error(`no frame with url containing ${fragment}`);
}
