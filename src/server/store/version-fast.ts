import { lstat, mkdir, readFile, readlink, readdir, rm, rmdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GITLINK_MODE, SYMLINK_MODE, TREE_MODE, blobShaOf, comparePaths, type ObjectStore, type TreeEntry } from './git-objects.js';

export const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export class FastPathUnavailable extends Error {}

export interface FileChange {
  path: string;
  entry: TreeEntry | null;
}

export interface WorkFile {
  mode: string;
  body: Buffer;
}

const unavailable = (reason: string): never => {
  throw new FastPathUnavailable(reason);
};

async function entriesOf(store: ObjectStore, tree: string | null): Promise<TreeEntry[]> {
  return tree === null || tree === EMPTY_TREE ? [] : store.readTree(tree);
}

export async function lookupPath(store: ObjectStore, tree: string, relative: string): Promise<TreeEntry | null> {
  const parts = relative.split('/');
  let current = tree;
  for (const [index, part] of parts.entries()) {
    const found = (await entriesOf(store, current)).find((entry) => entry.name === part) ?? null;
    if (!found || index === parts.length - 1) return found;
    if (found.mode !== TREE_MODE) return unavailable(`${relative} crosses a file in the tree`);
    current = found.sha;
  }
  return null;
}

function groupChanges(changes: Map<string, TreeEntry | null>): { direct: Map<string, TreeEntry | null>; nested: Map<string, Map<string, TreeEntry | null>> } {
  const direct = new Map<string, TreeEntry | null>();
  const nested = new Map<string, Map<string, TreeEntry | null>>();
  for (const [relative, entry] of changes) {
    const cut = relative.indexOf('/');
    if (cut === -1) {
      direct.set(relative, entry);
      continue;
    }
    const head = relative.slice(0, cut);
    const inner = nested.get(head) ?? new Map<string, TreeEntry | null>();
    inner.set(relative.slice(cut + 1), entry);
    nested.set(head, inner);
  }
  return { direct, nested };
}

export async function updateTree(store: ObjectStore, tree: string | null, changes: Map<string, TreeEntry | null>): Promise<string | null> {
  const byName = new Map((await entriesOf(store, tree)).map((entry) => [entry.name, entry]));
  const { direct, nested } = groupChanges(changes);
  for (const [name, entry] of direct) {
    if (byName.get(name)?.mode === TREE_MODE || nested.has(name)) unavailable(`${name} is a folder in the tree`);
    if (entry) byName.set(name, { ...entry, name });
    else byName.delete(name);
  }
  for (const [name, inner] of nested) {
    const existing = byName.get(name);
    if (existing && existing.mode !== TREE_MODE) unavailable(`${name} is a file in the tree`);
    const sub = await updateTree(store, existing?.sha ?? null, inner);
    if (sub === null) byName.delete(name);
    else byName.set(name, { mode: TREE_MODE, name, sha: sub });
  }
  if (byName.size === 0) return null;
  return store.writeTree([...byName.values()]);
}

async function allFiles(store: ObjectStore, tree: string, prefix: string, side: 'old' | 'new', out: FileChange[]): Promise<void> {
  for (const entry of await entriesOf(store, tree)) {
    const relative = `${prefix}${entry.name}`;
    if (entry.mode === TREE_MODE) await allFiles(store, entry.sha, `${relative}/`, side, out);
    else out.push({ path: relative, entry: side === 'new' ? entry : null });
  }
}

async function diffEntry(store: ObjectStore, relative: string, before: TreeEntry | undefined, after: TreeEntry | undefined, out: FileChange[]): Promise<void> {
  if (before && after && before.sha === after.sha && before.mode === after.mode) return;
  const beforeTree = before?.mode === TREE_MODE;
  const afterTree = after?.mode === TREE_MODE;
  if (beforeTree && afterTree) return diffInto(store, before.sha, after.sha, `${relative}/`, out);
  if (before && !beforeTree && !(after && !afterTree)) out.push({ path: relative, entry: null });
  if (beforeTree) await allFiles(store, before.sha, `${relative}/`, 'old', out);
  if (after && !afterTree) out.push({ path: relative, entry: after });
  if (afterTree) await allFiles(store, after.sha, `${relative}/`, 'new', out);
}

async function diffInto(store: ObjectStore, a: string | null, b: string | null, prefix: string, out: FileChange[]): Promise<void> {
  if (a === b) return;
  const left = new Map((await entriesOf(store, a)).map((entry) => [entry.name, entry]));
  const right = new Map((await entriesOf(store, b)).map((entry) => [entry.name, entry]));
  for (const name of new Set([...left.keys(), ...right.keys()])) await diffEntry(store, `${prefix}${name}`, left.get(name), right.get(name), out);
}

export async function diffTrees(store: ObjectStore, a: string | null, b: string | null): Promise<FileChange[]> {
  const out: FileChange[] = [];
  await diffInto(store, a, b, '', out);
  return out.sort((x, y) => comparePaths(x.path, y.path));
}

export async function readWorkFile(workTree: string, relative: string): Promise<WorkFile | 'missing' | 'folder'> {
  const absolute = path.join(workTree, relative);
  const info = await lstat(absolute).catch(() => null);
  if (!info) return 'missing';
  if (info.isDirectory()) return 'folder';
  if (info.isSymbolicLink()) return { mode: SYMLINK_MODE, body: Buffer.from(await readlink(absolute)) };
  if (!info.isFile()) return unavailable(`${relative} is not a file`);
  return { mode: info.mode & 0o100 ? '100755' : '100644', body: await readFile(absolute) };
}

export function sameAsWork(entry: TreeEntry, file: WorkFile): boolean {
  return entry.mode === file.mode && entry.sha === blobShaOf(file.body);
}

export function assertPlainFile(entry: TreeEntry | null, relative: string): void {
  if (entry && (entry.mode === TREE_MODE || entry.mode === GITLINK_MODE)) unavailable(`${relative} is not a plain file`);
}

async function removeEmptyParents(workTree: string, relative: string): Promise<void> {
  let dir = path.dirname(relative);
  while (dir !== '.' && dir !== '') {
    const absolute = path.join(workTree, dir);
    const left = await readdir(absolute).catch(() => null);
    if (left === null || left.length > 0) return;
    await rmdir(absolute).catch(() => undefined);
    dir = path.dirname(dir);
  }
}

async function assertWritable(workTree: string, relative: string): Promise<void> {
  const parts = relative.split('/');
  for (let depth = 1; depth < parts.length; depth += 1) {
    const info = await lstat(path.join(workTree, ...parts.slice(0, depth))).catch(() => null);
    if (info && !info.isDirectory()) unavailable(`${parts.slice(0, depth).join('/')} is a file on disk`);
  }
  const own = await lstat(path.join(workTree, relative)).catch(() => null);
  if (own?.isDirectory()) unavailable(`${relative} is a folder on disk`);
}

export async function checkWritable(workTree: string, changes: FileChange[]): Promise<void> {
  for (const change of changes) {
    assertPlainFile(change.entry, change.path);
    await assertWritable(workTree, change.path);
  }
}

export async function writeWorkFile(store: ObjectStore, workTree: string, change: FileChange): Promise<void> {
  const absolute = path.join(workTree, change.path);
  if (!change.entry) {
    await rm(absolute, { force: true });
    await removeEmptyParents(workTree, change.path);
    return;
  }
  const body = await store.readBlob(change.entry.sha);
  await mkdir(path.dirname(absolute), { recursive: true });
  await rm(absolute, { force: true });
  if (change.entry.mode === SYMLINK_MODE) await symlink(body.toString('utf8'), absolute);
  else await writeFile(absolute, body, { mode: change.entry.mode === '100755' ? 0o755 : 0o644 });
}
