import { randomBytes } from 'node:crypto';
import { constants, existsSync } from 'node:fs';
import { copyFile, lstat, mkdir, readdir, realpath, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { userGit } from '../git/user-git.js';
import { runGit, type GitScope } from './versions.js';

const STAT_BATCH = 256;
const REGULAR_MODES = new Set(['100644', '100755', '120000']);

interface IndexEntry {
  mode: string;
  sha: string;
  path: string;
}

interface UserRepo {
  gitDir: string;
  objectsDir: string;
}

export interface SeedOptions {
  maxBytes: number;
  neverTracked: string[];
}

function lines(text: string): string[] {
  return text.split('\n').map((line) => line.trim());
}

function splitNul(text: string): string[] {
  return text.split('\0').filter((entry) => entry !== '');
}

async function sameDevice(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([stat(a), stat(b)]);
  return left.dev === right.dev;
}

async function userRepoOf(workTree: string): Promise<UserRepo | null> {
  const probe = await userGit(workTree, ['rev-parse', '--show-toplevel', '--absolute-git-dir', '--git-common-dir', '--show-object-format'], { allowFail: true });
  if (probe.code !== 0) return null;
  const [top = '', gitDir = '', commonDir = '', format = ''] = lines(probe.stdout);
  if (format !== 'sha1' || top === '' || (await realpath(top)) !== (await realpath(workTree))) return null;
  const crlf = await userGit(workTree, ['config', '--get', 'core.autocrlf'], { allowFail: true });
  if (['true', 'input'].includes(crlf.stdout.trim().toLowerCase())) return null;
  const objectsDir = path.join(path.resolve(workTree, commonDir), 'objects');
  if (!existsSync(path.join(gitDir, 'index')) || existsSync(path.join(objectsDir, 'info', 'alternates'))) return null;
  return { gitDir, objectsDir };
}

async function clonePacks(from: string, to: string): Promise<void> {
  const packDir = path.join(from, 'pack');
  const files = existsSync(packDir) ? (await readdir(packDir)).filter((name) => !name.startsWith('tmp_') && !name.endsWith('.keep')) : [];
  await mkdir(path.join(to, 'pack'), { recursive: true });
  await Promise.all(files.map((name) => copyFile(path.join(packDir, name), path.join(to, 'pack', name), constants.COPYFILE_FICLONE)));
}

async function cloneLooseObjects(from: string, to: string, shas: string[]): Promise<void> {
  const loose = [...new Set(shas)].filter((sha) => existsSync(path.join(from, sha.slice(0, 2), sha.slice(2))));
  for (let start = 0; start < loose.length; start += STAT_BATCH) {
    await Promise.all(
      loose.slice(start, start + STAT_BATCH).map(async (sha) => {
        await mkdir(path.join(to, sha.slice(0, 2)), { recursive: true });
        await copyFile(path.join(from, sha.slice(0, 2), sha.slice(2)), path.join(to, sha.slice(0, 2), sha.slice(2)), constants.COPYFILE_FICLONE);
      }),
    );
  }
}

function parseEntries(text: string): IndexEntry[] | null {
  const entries: IndexEntry[] = [];
  for (const record of splitNul(text)) {
    const match = /^(\S) (\d{6}) ([0-9a-f]{40}) (\d)\t(.*)$/s.exec(record);
    if (!match || match[1] !== 'H' || match[4] !== '0') return null;
    entries.push({ mode: match[2] as string, sha: match[3] as string, path: match[5] as string });
  }
  return entries;
}

async function blobSizes(scope: GitScope, entries: IndexEntry[]): Promise<number[]> {
  if (entries.length === 0) return [];
  const { stdout } = await runGit(scope, ['cat-file', '--batch-check=%(objectsize)'], { input: `${entries.map((entry) => entry.sha).join('\n')}\n` });
  return lines(stdout).slice(0, entries.length).map(Number);
}

async function fileSizes(workTree: string, entries: IndexEntry[]): Promise<(number | null)[]> {
  const sizes: (number | null)[] = [];
  for (let start = 0; start < entries.length; start += STAT_BATCH) {
    const batch = entries.slice(start, start + STAT_BATCH);
    sizes.push(...(await Promise.all(batch.map((entry) => lstat(path.join(workTree, entry.path)).then((info) => info.size, () => null)))));
  }
  return sizes;
}

async function entriesToRehash(scope: GitScope, workTree: string, entries: IndexEntry[], options: SeedOptions): Promise<string[]> {
  const drop = new Set(splitNul((await runGit(scope, ['ls-files', '-ci', '--exclude-standard', '-z'])).stdout));
  for (const entry of entries) {
    if (options.neverTracked.includes(entry.path.split('/')[0] ?? '')) drop.add(entry.path);
  }
  const files = entries.filter((entry) => REGULAR_MODES.has(entry.mode) && !drop.has(entry.path));
  const [blobs, sizes] = await Promise.all([blobSizes(scope, files), fileSizes(workTree, files)]);
  files.forEach((entry, index) => {
    const size = sizes[index];
    if (size === null || size === undefined) return;
    if (size > options.maxBytes || size !== blobs[index]) drop.add(entry.path);
  });
  return [...drop];
}

async function addTreeMarkers(scope: GitScope, entries: IndexEntry[]): Promise<string[]> {
  const dirs = new Set<string>(['']);
  for (const entry of entries) {
    for (let cut = entry.path.lastIndexOf('/'); cut > 0; cut = entry.path.lastIndexOf('/', cut - 1)) {
      const dir = entry.path.slice(0, cut);
      if (dirs.has(dir)) break;
      dirs.add(dir);
    }
  }
  const name = `.studio-seed-${randomBytes(6).toString('hex')}`;
  const markers = [...dirs].map((dir) => (dir === '' ? name : `${dir}/${name}`));
  const empty = (await runGit(scope, ['hash-object', '-w', '--stdin'], { input: '' })).stdout.trim();
  await runGit(scope, ['update-index', '-z', '--index-info'], { input: markers.map((marker) => `100644 ${empty}\t${marker}\0`).join('') });
  return markers;
}

export async function seedFromUserRepo(scope: GitScope, workTree: string, options: SeedOptions): Promise<boolean> {
  const indexFile = scope.indexFile;
  if (!indexFile || existsSync(indexFile)) return false;
  try {
    const user = await userRepoOf(workTree);
    if (!user || !(await sameDevice(user.objectsDir, scope.gitDir))) return false;
    const objectsDir = path.join(scope.gitDir, 'objects');
    await copyFile(path.join(user.gitDir, 'index'), indexFile, constants.COPYFILE_FICLONE);
    const entries = parseEntries((await runGit(scope, ['ls-files', '-v', '-s', '-z'])).stdout);
    if (entries === null) throw new Error('index has entries the studio cannot reuse');
    await clonePacks(user.objectsDir, objectsDir);
    await cloneLooseObjects(user.objectsDir, objectsDir, entries.filter((entry) => entry.mode !== '160000').map((entry) => entry.sha));
    const rehash = await entriesToRehash(scope, workTree, entries, options);
    const markers = await addTreeMarkers(scope, entries);
    await runGit(scope, ['update-index', '-z', '--force-remove', '--stdin'], { input: `${[...rehash, ...markers].join('\0')}\0` });
    return true;
  } catch (error) {
    console.error('[versions] could not reuse the folder\'s git index; reading every file', error instanceof Error ? error.message : error);
    await rm(indexFile, { force: true });
    return false;
  }
}
