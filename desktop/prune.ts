import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';

export interface PruneOptions {
  keepTypes: boolean;
}

export interface PruneStats {
  files: number;
  bytes: number;
}

const JUNK_DIRS = new Set(['.github', '__tests__', 'test', 'tests', 'docs', 'doc', 'example', 'examples', 'benchmark', 'benchmarks', 'coverage']);
const JUNK_FILE = /(\.map|\.md|\.markdown|\.tsbuildinfo|^\.npmignore|^\.eslintrc(\..*)?|^\.prettierrc(\..*)?|^\.editorconfig|^\.travis\.yml)$/i;
const TYPE_FILE = /\.(d\.)?[mc]?ts$/;
const KEEP_FILE = /^(licen[cs]e|notice|copying)/i;
const TYPESCRIPT_SERVER = /^(_?tsserver(library)?|_?typingsInstaller)\.(js|d\.ts)$/;

export function isJunkFile(name: string, options: PruneOptions): boolean {
  if (KEEP_FILE.test(name)) return false;
  if (JUNK_FILE.test(name)) return true;
  return !options.keepTypes && TYPE_FILE.test(name);
}

function isTypescriptLib(dir: string): boolean {
  return path.basename(dir) === 'lib' && path.basename(path.dirname(dir)) === 'typescript';
}

function isTypescriptJunk(dir: string, name: string, isDir: boolean): boolean {
  if (!isTypescriptLib(dir)) return false;
  return isDir ? /^[a-z]{2}(-[a-z]{2})?$/.test(name) : TYPESCRIPT_SERVER.test(name);
}

function sizeOf(target: string): PruneStats {
  const stat = lstatSync(target);
  if (!stat.isDirectory()) return { files: 1, bytes: stat.size };
  return readdirSync(target).reduce<PruneStats>(
    (sum, name) => {
      const inner = sizeOf(path.join(target, name));
      return { files: sum.files + inner.files, bytes: sum.bytes + inner.bytes };
    },
    { files: 0, bytes: 0 },
  );
}

function remove(target: string, stats: PruneStats): void {
  const size = sizeOf(target);
  stats.files += size.files;
  stats.bytes += size.bytes;
  rmSync(target, { recursive: true, force: true });
}

function childDepth(name: string, depth: number): number {
  if (name === 'node_modules') return 0;
  return depth === 0 && name.startsWith('@') ? 0 : depth + 1;
}

function walk(dir: string, options: PruneOptions, stats: PruneStats, depth: number): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if ((depth > 0 && JUNK_DIRS.has(entry.name)) || isTypescriptJunk(dir, entry.name, true)) remove(target, stats);
      else walk(target, options, stats, childDepth(entry.name, depth));
    } else if (isJunkFile(entry.name, options) || isTypescriptJunk(dir, entry.name, false)) {
      remove(target, stats);
    }
  }
}

export function pruneModules(modulesDir: string, options: PruneOptions): PruneStats {
  const stats: PruneStats = { files: 0, bytes: 0 };
  walk(modulesDir, options, stats, 0);
  return stats;
}

function digest(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

export function linkEsbuildBinary(modulesDir: string, arch: string = process.arch): PruneStats {
  const copy = path.join(modulesDir, 'esbuild', 'bin', 'esbuild');
  const native = path.join(modulesDir, '@esbuild', `darwin-${arch}`, 'bin', 'esbuild');
  if (!existsSync(copy) || !existsSync(native) || lstatSync(copy).isSymbolicLink()) return { files: 0, bytes: 0 };
  if (digest(copy) !== digest(native)) return { files: 0, bytes: 0 };
  const bytes = lstatSync(copy).size;
  rmSync(copy);
  symlinkSync(path.relative(path.dirname(copy), native), copy);
  return { files: 1, bytes };
}
