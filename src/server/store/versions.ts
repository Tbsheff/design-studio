import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { constants as fsConstants, existsSync } from 'node:fs';
import { copyFile, cp, lstat, mkdir, readdir, readFile, realpath, rename, rm, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CANVAS_FILE } from '../../shared/canvas-file.js';
import { LINKS_FILE } from '../../shared/links.js';
import type { Direction, Project, Version, VersionMeta, WorkTreeStatus } from '../../shared/contracts.js';
import { baseTitle, isRestoreKind, restoreTitle } from '../../shared/version-title.js';
import { isOutsideEdit, isOwnEdit, stampOrigin } from '../edit-origin.js';
import type { ServerConfig, SessionEndResult, SessionSpan, VersionStore } from '../types.js';
import { BadRequestError, ConflictError, NotFoundError, assertSafeId } from './errors.js';
import { createKeyedMutex } from './mutex.js';
import { seedFromUserRepo } from './version-seed.js';
import { createChangeTracker } from './version-tracker.js';
import { ObjectStore, gitIdent, type CommitInfo } from './git-objects.js';
import { createDirectStore } from './version-direct.js';
import { FastPathUnavailable, diffTrees } from './version-fast.js';

export const GIT_EXCLUDES = ['node_modules', 'node_modules/', 'dist/', '.vite/', '.next/', '.turbo/', '.studio/*', `!${CANVAS_FILE}`, `!${LINKS_FILE}`, '.DS_Store'];
const LAYOUT_FILES = [CANVAS_FILE, LINKS_FILE];
const layoutFilesOf = (project: Project): string[] => (project.app ? [] : LAYOUT_FILES);
const NEVER_TRACKED = ['node_modules'];
const APP_NEVER_TRACKED = [...NEVER_TRACKED, '.studio'];
const MAX_SCOPED_PATHS = 500;
const MAX_CACHED_TREES = 4096;
const LOOSE_OBJECTS_TO_PACK = 1000;
const APP_MAX_TRACKED_BYTES = 2 * 1024 * 1024;
const APP_ATTRIBUTES = '* -text -filter -ident\n';
const STAT_BATCH = 256;
const APP_EXCLUDES = ['.studio/', '*.onnx', '*.mlmodelc/', '*.mlpackage/', '*.sqlite', '*.db', '*.m4a', '*.mp3', '*.wav', '*.mp4', '*.mov', '*.zip', '*.tar', '*.tgz', '*.gz', '.env', '.env.*', '!.env.example', '*.pem', '*.key'];

const META_PREFIX = 'studio-meta: ';
const MAX_ORIGIN_DEPTH = 64;
const FIELD = '\x1f';
const RECORD = '\x1e';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const ZERO_SHA = '0'.repeat(40);
const FORCED_KINDS = new Set<VersionMeta['kind']>(['fork', 'undo', 'restore']);
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const STUDIO_NAME = 'Design Studio';
const STUDIO_EMAIL = 'studio@localhost';

type OwnSpan = Omit<SessionSpan, 'outside'> & { base: string; head: string; outside: Version[] };

interface StoredVersionMeta extends VersionMeta {
  directionId: string;
  createdAt: number;
}

export interface GitScope {
  gitDir: string;
  workTree?: string;
  indexFile?: string;
  untracked?: string[];
}

interface GitResult {
  stdout: string;
}

let gitBinary: Promise<string> | null = null;

function resolveGitBinary(): Promise<string> {
  const override = process.env.STUDIO_GIT;
  if (override) return Promise.resolve(override);
  gitBinary ??= new Promise((resolve) => {
    execFile('git', ['--exec-path'], { encoding: 'utf8' }, (error, stdout) => {
      const candidate = error ? '' : path.join(stdout.trim(), 'git');
      resolve(candidate !== '' && existsSync(candidate) ? candidate : 'git');
    });
  });
  return gitBinary;
}

function gitEnv(scope: GitScope): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_DIR: scope.gitDir,
    GIT_CONFIG_GLOBAL: os.devNull,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Design Studio',
    GIT_AUTHOR_EMAIL: 'studio@localhost',
    GIT_COMMITTER_NAME: 'Design Studio',
    GIT_COMMITTER_EMAIL: 'studio@localhost',
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
  };
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  if (scope.workTree !== undefined) env.GIT_WORK_TREE = scope.workTree;
  if (scope.indexFile !== undefined) env.GIT_INDEX_FILE = scope.indexFile;
  return env;
}

export async function runGit(scope: GitScope, args: string[], options: { cwd?: string; input?: string; okCodes?: number[] } = {}): Promise<GitResult> {
  const binary = await resolveGitBinary();
  return new Promise((resolve, reject) => {
    const child = execFile(
      binary,
      args,
      { env: gitEnv(scope), cwd: options.cwd ?? scope.workTree ?? scope.gitDir, maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout, stderr) => {
        if (error && !(typeof error.code === 'number' && options.okCodes?.includes(error.code))) {
          reject(new Error(`git ${args[0] ?? ''} failed: ${stderr.trim() || error.message}`));
          return;
        }
        resolve({ stdout });
      },
    );
    if (options.input !== undefined) {
      child.stdin?.on('error', () => undefined);
      child.stdin?.end(options.input);
    }
  });
}

export async function runGitBuffer(scope: GitScope, args: string[]): Promise<Uint8Array> {
  const binary = await resolveGitBinary();
  return new Promise((resolve, reject) => {
    execFile(
      binary,
      args,
      { env: gitEnv(scope), cwd: scope.gitDir, maxBuffer: 1024 * 1024 * 1024, encoding: 'buffer' },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`git ${args[0] ?? ''} failed: ${stderr.toString('utf8').trim() || error.message}`));
          return;
        }
        resolve(new Uint8Array(stdout));
      },
    );
  });
}

function isInside(root: string, target: string): boolean {
  return target.startsWith(root + path.sep);
}

async function moveFile(source: string, target: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await rename(source, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
    await cp(source, target, { verbatimSymlinks: true, preserveTimestamps: true });
    await unlink(source);
  }
}

const SERVER_STARTED_AT = Date.now();

async function removeStaleLocks(gitDir: string): Promise<void> {
  if (!existsSync(gitDir)) return;
  const top = await readdir(gitDir);
  const refs = existsSync(path.join(gitDir, 'refs')) ? (await readdir(path.join(gitDir, 'refs'), { recursive: true })).map((entry) => path.join('refs', entry)) : [];
  const locks = [...top, ...refs].filter((entry) => entry.endsWith('.lock'));
  for (const entry of locks) {
    const target = path.join(gitDir, entry);
    const info = await lstat(target).catch(() => null);
    if (info?.isFile() && info.mtimeMs < SERVER_STARTED_AT) {
      await rm(target, { force: true });
      console.warn(`[versions] removed stale git lock ${target}`);
    }
  }
}

async function pathExists(target: string): Promise<boolean> {
  return lstat(target).then(
    () => true,
    () => false,
  );
}

function splitNul(text: string): string[] {
  return text.split('\0').filter((entry) => entry !== '');
}

function parseLogRecord(record: string): Version {
  const [sha = '', parents = '', committedAt = '0'] = record.split(FIELD, 3);
  const bodyStart = sha.length + parents.length + committedAt.length + 3;
  const bodyEnd = record.indexOf(`${FIELD}\0`, bodyStart);
  const body = bodyEnd === -1 ? record.slice(bodyStart) : record.slice(bodyStart, bodyEnd);
  const message = body.split(FIELD)[0] ?? '';
  const files = bodyEnd === -1 ? '' : record.slice(bodyEnd + 2).replace(/^\n/, '');
  return toVersion(sha, parents, committedAt, message, splitNul(files));
}

function parseCommitMessage(message: string): { title: string; meta: StoredVersionMeta | null } {
  const lines = message.replace(/\n+$/, '').split('\n');
  const title = lines[0] ?? '';
  const metaLine = lines.find((line) => line.startsWith(META_PREFIX));
  if (!metaLine) return { title, meta: null };
  try {
    return { title, meta: JSON.parse(metaLine.slice(META_PREFIX.length)) as StoredVersionMeta };
  } catch {
    return { title, meta: null };
  }
}

function originMeta(meta: StoredVersionMeta | null): Pick<VersionMeta, 'origin' | 'client'> {
  if (meta?.origin !== 'mcp') return {};
  return typeof meta.client === 'string' ? { origin: 'mcp', client: meta.client } : { origin: 'mcp' };
}

function toVersion(sha: string, parents: string, committedAt: string, message: string, changedFiles: string[]): Version {
  const { title, meta } = parseCommitMessage(message);
  const parentId = parents.trim().split(' ').filter(Boolean)[0] ?? null;
  const publicMeta: VersionMeta = { kind: meta?.kind ?? 'manual', ...originMeta(meta) };
  if (meta?.runId !== undefined) publicMeta.runId = meta.runId;
  if (meta?.prompt !== undefined) publicMeta.prompt = meta.prompt;
  if (meta?.restoredFrom !== undefined) publicMeta.restoredFrom = meta.restoredFrom;
  if (meta?.directionId) publicMeta.directionId = meta.directionId;
  if (meta?.level) publicMeta.level = meta.level;
  return {
    id: sha,
    directionId: meta?.directionId ?? '',
    parentId,
    title,
    meta: publicMeta,
    createdAt: meta?.createdAt ?? Number(committedAt) * 1000,
    changedFiles,
  };
}

export function createVersionStore(config: ServerConfig): VersionStore {
  const lock = createKeyedMutex();
  const freshExcludes = new Set<string>();
  const untrackedCounts = new Map<string, number>();
  const tracker = createChangeTracker(MAX_SCOPED_PATHS);
  const headIndexTrees = new Map<string, string>();
  const commitTrees = new Map<string, string>();
  const lockSweeps = new Map<string, Promise<void>>();
  const objectStores = new Map<string, ObjectStore>();

  const largeUntracked = async (project: Project): Promise<string[]> => {
    const main = project.directions[0];
    if (!main) return [];
    const { stdout } = await runGit(directionScope(project, main), ['ls-files', '--others', '--exclude-standard', '-z']);
    const untracked = splitNul(stdout);
    untrackedCounts.set(project.id, untracked.length);
    const large: string[] = [];
    for (let start = 0; start < untracked.length; start += STAT_BATCH) {
      const batch = untracked.slice(start, start + STAT_BATCH);
      const sizes = await Promise.all(batch.map((relative) => stat(path.join(main.workTree, relative)).then((info) => info.size, () => 0)));
      batch.forEach((relative, index) => {
        if ((sizes[index] ?? 0) > APP_MAX_TRACKED_BYTES) large.push(`/${relative.replace(/([*?[\]\\!#])/g, '\\$1')}`);
      });
    }
    return large;
  };

  const writeBaseExclude = async (project: Project): Promise<string[]> => {
    const infoDir = path.join(gitDirOf(project), 'info');
    await mkdir(infoDir, { recursive: true });
    const base = project.app ? [...GIT_EXCLUDES, ...APP_EXCLUDES] : GIT_EXCLUDES;
    await writeFile(path.join(infoDir, 'exclude'), `${base.join('\n')}\n`);
    return base;
  };

  const writeExclude = async (project: Project): Promise<void> => {
    const infoDir = path.join(gitDirOf(project), 'info');
    const base = await writeBaseExclude(project);
    if (project.app) {
      await writeFile(path.join(infoDir, 'attributes'), APP_ATTRIBUTES);
      const large = await largeUntracked(project);
      if (large.length > 0) await writeFile(path.join(infoDir, 'exclude'), `${[...base, ...large].join('\n')}\n`);
    }
    freshExcludes.add(project.id);
  };

  const refreshExclude = async (project: Project): Promise<void> => {
    if (freshExcludes.has(project.id) || !existsSync(path.join(gitDirOf(project), 'HEAD'))) return;
    await writeExclude(project);
  };

  const projectRoot = (project: Project): string =>
    path.join(config.dataDir, 'projects', assertSafeId(project.id, 'projectId'));
  const gitDirOf = (project: Project): string => path.join(projectRoot(project), 'git');
  const repoScope = (project: Project): GitScope => ({ gitDir: gitDirOf(project) });
  const directionScope = (project: Project, direction: Direction): GitScope => ({
    gitDir: gitDirOf(project),
    workTree: direction.workTree,
    indexFile: path.join(gitDirOf(project), `index-${assertSafeId(direction.id, 'directionId')}`),
    ...(project.app ? { untracked: APP_NEVER_TRACKED } : {}),
  });
  const refOf = (direction: Direction): string => `refs/heads/${direction.branch}`;
  const lockKey = (project: Project, direction: Direction): string => `${project.id}/${direction.id}`;

  const objectsOf = (project: Project): ObjectStore => {
    const gitDir = gitDirOf(project);
    let store = objectStores.get(gitDir);
    if (!store) {
      store = new ObjectStore(gitDir, resolveGitBinary, gitEnv(repoScope(project)));
      objectStores.set(gitDir, store);
    }
    return store;
  };

  const readCommitObject = async (project: Project, sha: string): Promise<CommitInfo | null> => {
    if (!existsSync(path.join(gitDirOf(project), 'HEAD'))) return null;
    return objectsOf(project).readCommit(sha);
  };

  const requireCommit = async (project: Project, versionId: string): Promise<string> => {
    if (!SHA_PATTERN.test(versionId)) throw new BadRequestError('invalid versionId');
    if ((await readCommitObject(project, versionId)) === null) throw new NotFoundError(`version ${versionId} not found`);
    return versionId;
  };

  const treeOf = async (project: Project, commit: string): Promise<string> => {
    const known = SHA_PATTERN.test(commit) ? commitTrees.get(commit) : undefined;
    if (known) return known;
    const parsed = SHA_PATTERN.test(commit) ? await readCommitObject(project, commit) : null;
    const tree = parsed?.tree ?? (await runGit(repoScope(project), ['rev-parse', `${commit}^{tree}`])).stdout.trim();
    if (SHA_PATTERN.test(commit)) {
      if (commitTrees.size > MAX_CACHED_TREES) commitTrees.clear();
      commitTrees.set(commit, tree);
    }
    return tree;
  };

  const changedFilesOf = async (project: Project, sha: string, hasParent: boolean): Promise<string[]> => {
    const args = ['diff-tree', '--no-commit-id', '--name-only', '-r', '-z'];
    if (!hasParent) args.push('--root');
    args.push(sha);
    const { stdout } = await runGit(repoScope(project), args);
    return splitNul(stdout);
  };

  const readVersions = async (project: Project, revArgs: string[]): Promise<Version[]> => {
    const format = '%x1e' + ['%H', '%P', '%ct', '%B'].join('%x1f') + '%x1f';
    const { stdout } = await runGit(repoScope(project), ['log', `--format=${format}`, '--name-only', '--no-renames', '--root', '-z', ...revArgs, '--']);
    return stdout
      .split(RECORD)
      .filter((record) => record !== '')
      .map(parseLogRecord);
  };

  const getVersion = async (project: Project, versionId: string): Promise<Version> => {
    const sha = await requireCommit(project, versionId);
    const [version] = await readVersions(project, ['-n', '1', sha]);
    if (!version) throw new NotFoundError(`version ${versionId} not found`);
    return version;
  };

  const commitInfo = async (project: Project, sha: string): Promise<{ parentId: string | null; title: string; meta: StoredVersionMeta | null }> => {
    const commit = await readCommitObject(project, sha);
    if (!commit) throw new NotFoundError(`version ${sha} not found`);
    const parsed = parseCommitMessage(commit.message);
    return { parentId: commit.parents[0] ?? null, title: parsed.title, meta: parsed.meta };
  };

  const originTitleOf = async (project: Project, sha: string): Promise<string> => {
    let info = await commitInfo(project, sha);
    for (let depth = 0; depth < MAX_ORIGIN_DEPTH; depth += 1) {
      const meta = info.meta;
      if (!meta || !isRestoreKind(meta.kind) || !meta.restoredFrom) break;
      info = await commitInfo(project, meta.restoredFrom);
    }
    return baseTitle(info.title, info.meta?.kind ?? 'manual');
  };

  const untrackNeverTracked = async (scope: GitScope): Promise<void> => {
    await runGit(scope, ['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', ...(scope.untracked ?? NEVER_TRACKED)]);
  };

  const stageAll = async (scope: GitScope, firstOfApp = false): Promise<void> => {
    await runGit(scope, [...(firstOfApp ? ['-c', 'core.bigFileThreshold=1'] : []), 'add', '-A', '--', '.']);
    await untrackNeverTracked(scope);
  };

  const rootOf = (direction: Direction): string => path.resolve(direction.workTree);

  const fullStage = async (project: Project, direction: Direction, firstOfApp = false): Promise<void> => {
    const key = lockKey(project, direction);
    if (project.app) tracker.beginFullScan(key, rootOf(direction));
    await stageAll(directionScope(project, direction), firstOfApp);
    if (project.app) tracker.endFullScan(key);
  };

  const scopedPaths = (scope: GitScope, paths: string[]): string[] => {
    const never = scope.untracked ?? NEVER_TRACKED;
    return paths.filter((entry) => entry !== '' && !never.includes(entry.split('/')[0] ?? ''));
  };

  const stagePaths = async (project: Project, direction: Direction, paths: string[]): Promise<void> => {
    const scope = directionScope(project, direction);
    const scoped = scopedPaths(scope, paths);
    if (scoped.length > MAX_SCOPED_PATHS) return fullStage(project, direction);
    if (scoped.length === 0) return;
    try {
      const stageable = await stageableOf(scope, scoped);
      if (stageable.length > 0) await runGit(scope, ['--literal-pathspecs', 'add', '-A', '--', ...stageable]);
    } catch {
      await fullStage(project, direction);
    }
  };

  const stageableOf = async (scope: GitScope, paths: string[]): Promise<string[]> => {
    const listed = splitNul((await runGit(scope, ['--literal-pathspecs', 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...paths])).stdout);
    const exact = new Set(listed);
    return paths.filter((relative) => exact.has(relative) || listed.some((entry) => entry.startsWith(`${relative}/`)));
  };

  const stageChanged = async (project: Project, direction: Direction): Promise<void> => {
    const changed = project.app ? await tracker.changedSinceScan(lockKey(project, direction), rootOf(direction)) : null;
    if (changed === null) return fullStage(project, direction);
    const scope = directionScope(project, direction);
    const scoped = scopedPaths(scope, changed);
    if (scoped.length === 0) return;
    try {
      const stageable = await stageableOf(scope, scoped);
      if (stageable.length > 0) await runGit(scope, ['--literal-pathspecs', 'add', '-A', '--', ...stageable]);
    } catch {
      await fullStage(project, direction);
    }
  };

  const commitTree = async (
    project: Project,
    direction: Direction,
    tree: string,
    parent: string | null,
    currentHead: string | null,
    title: string,
    meta: VersionMeta,
    knownChanges?: string[],
  ): Promise<Version> => {
    const stored: StoredVersionMeta = { ...stampOrigin(meta), directionId: direction.id, createdAt: Date.now() };
    const cleanTitle = title.replace(/\s+/g, ' ').trim() || meta.kind;
    const message = `${cleanTitle}\n\n${META_PREFIX}${JSON.stringify(stored)}\n`;
    const store = objectsOf(project);
    const ident = gitIdent(STUDIO_NAME, STUDIO_EMAIL, new Date(stored.createdAt));
    const sha = await store.writeCommit(tree, parent === null ? [] : [parent], ident, message);
    commitTrees.set(sha, tree);
    await store.updateRef(refOf(direction), sha, currentHead, ident);
    const changedFiles = knownChanges ?? (parent === null ? await changedFilesOf(project, sha, false) : (await diffTrees(store, await treeOf(project, parent), tree)).map((change) => change.path));
    return toVersion(sha, parent ?? '', String(Math.floor(stored.createdAt / 1000)), message, changedFiles);
  };

  const headOf = async (project: Project, direction: Direction): Promise<string | null> => {
    if (!existsSync(path.join(gitDirOf(project), 'HEAD'))) return null;
    const sha = await objectsOf(project).readRef(refOf(direction));
    return sha !== null && (await readCommitObject(project, sha)) !== null ? sha : null;
  };

  const isAncestor = async (project: Project, base: string, head: string): Promise<boolean> => {
    try {
      await runGit(repoScope(project), ['merge-base', '--is-ancestor', base, head]);
      return true;
    } catch {
      return false;
    }
  };

  const spanOf = async (project: Project, direction: Direction, baseVersionId: string): Promise<OwnSpan> => {
    const base = await requireCommit(project, baseVersionId);
    const head = await headOf(project, direction);
    if (head === null || !(await isAncestor(project, base, head))) {
      return { base, head: head ?? base, count: 0, dirty: false, foreign: 'This design changed outside the edit session.', titles: [], outside: [] };
    }
    if (head === base) return { base, head, count: 0, dirty: false, foreign: null, titles: [], outside: [] };
    const span = (await readVersions(project, [`${base}..${head}`])).reverse();
    const own = span.filter((version) => isOwnEdit(version.meta));
    const outside = span.filter((version) => isOutsideEdit(version.meta));
    const other = span.find((version) => !isOwnEdit(version.meta) && !isOutsideEdit(version.meta));
    const foreign = other ? `"${other.title}" happened during the edit session.` : null;
    const headTree = await treeOf(project, head);
    const kept = outside.length > 0 && own.length > 0 ? await replayTrees(project, await treeOf(project, base), outside) : null;
    const dirty = own.length > 0 && (outside.length === 0 ? headTree !== (await treeOf(project, base)) : kept === null || kept.at(-1) !== headTree);
    return { base, head, count: own.length, dirty, foreign, titles: own.map((version) => version.title), outside };
  };

  const replayTree = async (project: Project, onto: string, version: Version): Promise<string | null> => {
    const from = version.parentId ? await treeOf(project, version.parentId) : EMPTY_TREE;
    try {
      const { stdout } = await runGit(repoScope(project), ['merge-tree', '--write-tree', `--merge-base=${from}`, onto, await treeOf(project, version.id)]);
      return stdout.split('\n')[0]?.trim() || null;
    } catch {
      return null;
    }
  };

  const replayTrees = async (project: Project, onto: string, versions: Version[]): Promise<string[] | null> => {
    const trees: string[] = [];
    let current = onto;
    for (const version of versions) {
      const next = await replayTree(project, current, version);
      if (next === null) return null;
      trees.push(next);
      current = next;
    }
    return trees;
  };

  const discardOwnOnly = async (project: Project, direction: Direction, span: OwnSpan, changed: string[]): Promise<SessionEndResult> => {
    const trees = await replayTrees(project, await treeOf(project, span.base), span.outside);
    if (trees === null) throw new ConflictError('An outside edit changed the same lines as your edits, so Discard would undo it too. Undo your edits one at a time, or save them.');
    let parent = span.base;
    let current = span.head;
    const remapped: Record<string, { id: string; parentId: string }> = {};
    for (const [index, version] of span.outside.entries()) {
      const made = await commitTree(project, direction, trees[index] as string, parent, current, version.title, version.meta);
      remapped[version.id] = { id: made.id, parentId: parent };
      parent = made.id;
      current = made.id;
    }
    await resetWorkTree(project, direction, await treeOf(project, span.head), await treeOf(project, parent), 'keep');
    return { version: null, head: parent, changed, remapped };
  };

  const listUntracked = async (scope: GitScope): Promise<string[]> => {
    const { stdout } = await runGit(scope, ['ls-files', '--others', '--exclude-standard', '-z']);
    return splitNul(stdout);
  };

  const moveToTrash = async (project: Project, workTree: string, relatives: string[]): Promise<void> => {
    if (relatives.length === 0) return;
    const trashDir = path.join(projectRoot(project), 'trash', `${Date.now()}-${randomBytes(3).toString('hex')}`);
    const root = path.resolve(workTree);
    for (const relative of relatives) {
      const source = path.resolve(root, relative);
      if (!isInside(root, source) || !(await pathExists(source))) continue;
      await moveFile(source, path.join(trashDir, relative));
    }
  };

  const indexToTree = async (scope: GitScope, tree: string | null): Promise<void> => {
    await runGit(scope, tree === null ? ['read-tree', '--empty'] : ['read-tree', '--reset', tree]);
    await untrackNeverTracked(scope);
  };

  const resetWorkTree = async (
    project: Project,
    direction: Direction,
    from: string | null,
    to: string | null,
    untracked: 'keep' | 'trash',
  ): Promise<void> => {
    const scope = directionScope(project, direction);
    direct.forget(project, direction);
    await direct.syncIndex(project, direction);
    const staged = await runGit(scope, from === null ? ['ls-files', '-z'] : ['diff-index', '--cached', '--name-only', '-z', from]);
    tracker.note(lockKey(project, direction), splitNul(staged.stdout));
    await indexToTree(scope, from);
    if (untracked === 'trash') await moveToTrash(project, direction.workTree, await listUntracked(scope));
    if (to === null) {
      const { stdout } = await runGit(scope, ['ls-files', '-z']);
      await moveToTrash(project, direction.workTree, splitNul(stdout));
      await runGit(scope, ['read-tree', '--empty']);
      return;
    }
    await runGit(scope, ['read-tree', '-u', '--reset', to]);
    await untrackNeverTracked(scope);
  };

  const statusOf = async (project: Project, direction: Direction, paths?: string[]): Promise<WorkTreeStatus> => {
    await refreshExclude(project);
    const scope = directionScope(project, direction);
    const fast = project.app ? await direct.status(project, direction, paths) : 'git';
    if (typeof fast !== 'string') return fast;
    await direct.syncIndex(project, direction);
    if (fast === 'full') await fullStage(project, direction);
    else await (paths === undefined ? stageChanged(project, direction) : stagePaths(project, direction, paths));
    const head = await headOf(project, direction);
    const { stdout } = head
      ? await runGit(scope, ['diff-index', '--cached', '--name-only', '-z', head])
      : await runGit(scope, ['ls-files', '-z']);
    const changed = splitNul(stdout).filter((entry) => !LAYOUT_FILES.includes(entry));
    if (project.app && head && (paths === undefined || fast === 'full')) direct.remember(project, direction, head, changed);
    return { dirty: changed.length > 0, changed };
  };

  const layoutOf = (direction: Direction, file: string): string => path.join(direction.workTree, ...file.split('/'));

  const checkoutTo = async (project: Project, sha: string, targetDir: string): Promise<void> => {
    await mkdir(targetDir, { recursive: true });
    const indexFile = path.join(gitDirOf(project), `index-tmp-${randomBytes(6).toString('hex')}`);
    const scope: GitScope = { gitDir: gitDirOf(project), workTree: targetDir, indexFile };
    try {
      await runGit(scope, ['read-tree', sha]);
      await runGit(scope, ['checkout-index', '-a', '-f', `--prefix=${targetDir}${path.sep}`]);
    } finally {
      await rm(indexFile, { force: true });
    }
  };

  const linkSnapshotModules = async (project: Project, snapshotDir: string): Promise<void> => {
    if (project.kind !== 'react') return;
    const main = project.directions.find((direction) => direction.id === 'main') ?? project.directions[0];
    if (!main) return;
    const source = path.join(main.workTree, 'node_modules');
    if (!existsSync(source)) return;
    const real = await realpath(source);
    await symlink(real, path.join(snapshotDir, 'node_modules'), 'dir').catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
    });
  };

  const direct = createDirectStore({
    objects: objectsOf,
    headOf,
    treeOf,
    keyOf: lockKey,
    neverTracked: (project) => (project.app ? APP_NEVER_TRACKED : NEVER_TRACKED),
    staleMarkerOf: (project, direction) => path.join(gitDirOf(project), `index-${assertSafeId(direction.id, 'directionId')}.stale`),
    changedSinceScan: (project, direction) => tracker.changedSinceScan(lockKey(project, direction), rootOf(direction)),
    ignored: async (project, direction, paths) => {
      const { stdout } = await runGit(directionScope(project, direction), ['check-ignore', '--no-index', '-z', '--stdin'], { input: `${paths.join('\0')}\0`, okCodes: [1] });
      return new Set(splitNul(stdout));
    },
    stageGit: (project, direction, paths) => stagePaths(project, direction, paths),
    resetIndex: async (project, direction, tree) => {
      await runGit(directionScope(project, direction), ['read-tree', '--reset', tree]);
    },
  });

  const commitDirect = async (project: Project, direction: Direction, paths: string[], title: string, meta: VersionMeta): Promise<Version | null | undefined> => {
    const head = await headOf(project, direction);
    if (head === null) return undefined;
    try {
      const built = await direct.buildCommit(project, direction, head, paths);
      if (built === null) return null;
      const version = await commitTree(project, direction, built.tree, head, head, title, meta, built.changed);
      direct.committed(project, direction, head, version.id, paths);
      return version;
    } catch (error) {
      if (error instanceof FastPathUnavailable) return undefined;
      throw error;
    }
  };

  const sweepLocks = (project: Project): Promise<void> => {
    let sweep = lockSweeps.get(project.id);
    if (!sweep) {
      sweep = removeStaleLocks(gitDirOf(project)).catch(() => undefined);
      lockSweeps.set(project.id, sweep);
    }
    return sweep;
  };

  const locked = <T>(project: Project, direction: Direction, task: () => Promise<T>): Promise<T> =>
    lock(lockKey(project, direction), async () => {
      await sweepLocks(project);
      return task();
    });

  const seedIndex = async (project: Project): Promise<void> => {
    const main = project.directions[0];
    if (!main) return;
    await locked(project, main, async () => {
      if ((await headOf(project, main)) !== null) return;
      await writeBaseExclude(project);
      await seedFromUserRepo(directionScope(project, main), main.workTree, { maxBytes: APP_MAX_TRACKED_BYTES, neverTracked: APP_NEVER_TRACKED });
    });
  };

  const packLooseObjects = (project: Project): void => {
    const pack = async (): Promise<void> => {
      const { stdout } = await runGit(repoScope(project), ['count-objects']);
      if (Number(stdout.split(' ')[0]) > LOOSE_OBJECTS_TO_PACK) await runGit(repoScope(project), ['repack', '-d', '-q']);
    };
    pack().catch((error: unknown) => console.error('[versions] could not pack the first version', error instanceof Error ? error.message : error));
  };

  const headIndexOf = (project: Project, direction: Direction): string => path.join(gitDirOf(project), `index-head-${assertSafeId(direction.id, 'directionId')}`);

  const loadHeadIndex = async (project: Project, direction: Direction, head: string | null, target: string): Promise<boolean> => {
    const headTree = head === null ? null : await treeOf(project, head);
    const cached = headIndexOf(project, direction);
    if (headTree !== null && headIndexTrees.get(lockKey(project, direction)) === headTree && existsSync(cached)) {
      await copyFile(cached, target, fsConstants.COPYFILE_FICLONE);
      return true;
    }
    await runGit({ ...directionScope(project, direction), indexFile: target }, head === null ? ['read-tree', '--empty'] : ['read-tree', head]);
    return false;
  };

  const keepHeadIndex = async (project: Project, direction: Direction, indexFile: string, tree: string): Promise<void> => {
    await rename(indexFile, headIndexOf(project, direction));
    headIndexTrees.set(lockKey(project, direction), tree);
  };

  const commitPaths = async (project: Project, direction: Direction, paths: string[], title: string, meta: VersionMeta): Promise<Version | null> => {
    const head = await headOf(project, direction);
    const tempIndex = path.join(gitDirOf(project), `index-file-${randomBytes(6).toString('hex')}`);
    const tempScope: GitScope = { ...directionScope(project, direction), indexFile: tempIndex };
    try {
      const cached = await loadHeadIndex(project, direction, head, tempIndex);
      await runGit(tempScope, ['--literal-pathspecs', 'add', '-A', '--', ...paths]);
      if (tempScope.untracked && (!cached || scopedPaths(tempScope, paths).length !== paths.length)) await untrackNeverTracked(tempScope);
      const tree = (await runGit(tempScope, ['write-tree'])).stdout.trim();
      if (head !== null && (await treeOf(project, head)) === tree) {
        await keepHeadIndex(project, direction, tempIndex, tree);
        return null;
      }
      const version = await commitTree(project, direction, tree, head, head, title, meta);
      await keepHeadIndex(project, direction, tempIndex, tree);
      await runGit(directionScope(project, direction), ['--literal-pathspecs', 'add', '-A', '--', ...paths]);
      return version;
    } finally {
      await rm(tempIndex, { force: true });
    }
  };

  return {
    async ensureRepo(project: Project): Promise<void> {
      const gitDir = gitDirOf(project);
      if (!existsSync(path.join(gitDir, 'HEAD'))) {
        await mkdir(gitDir, { recursive: true });
        await runGit(repoScope(project), ['init', '-q', '--bare', gitDir], { cwd: gitDir });
        const scope = repoScope(project);
        await runGit(scope, ['config', 'core.bare', 'false']);
        await runGit(scope, ['config', 'core.autocrlf', 'false']);
        await runGit(scope, ['config', 'core.quotepath', 'false']);
        await runGit(scope, ['config', 'gc.auto', '0']);
      }
      await runGit(repoScope(project), ['config', 'core.untrackedCache', 'true']);
      await sweepLocks(project);
      if (project.app) await seedIndex(project);
      await writeExclude(project);
    },

    commitFile(project: Project, direction: Direction, relative: string | string[], title: string, meta: VersionMeta): Promise<Version | null> {
      const listed = Array.isArray(relative) ? relative : [relative];
      const paths = [...listed, ...layoutFilesOf(project).filter((file) => !listed.includes(file) && existsSync(layoutOf(direction, file)))];
      return locked(project, direction, async () => {
        const fast = project.app ? await commitDirect(project, direction, paths, title, meta) : undefined;
        if (fast !== undefined) return fast;
        await direct.syncIndex(project, direction);
        return commitPaths(project, direction, paths, title, meta);
      });
    },

    commit(project: Project, direction: Direction, title: string, meta: VersionMeta): Promise<Version | null> {
      return locked(project, direction, async () => {
        await refreshExclude(project);
        const scope = directionScope(project, direction);
        const head = await headOf(project, direction);
        direct.forget(project, direction);
        await direct.syncIndex(project, direction);
        await fullStage(project, direction, Boolean(project.app) && head === null);
        const { stdout } = await runGit(scope, ['write-tree']);
        const tree = stdout.trim();
        const parent = head ?? (direction.parentVersionId ? await requireCommit(project, direction.parentVersionId) : null);
        if (parent !== null && !FORCED_KINDS.has(meta.kind) && (await treeOf(project, parent)) === tree) return null;
        const version = await commitTree(project, direction, tree, parent, head, title, meta);
        if (head === null) packLooseObjects(project);
        if (project.app) direct.remember(project, direction, version.id, []);
        return version;
      });
    },

    async list(project: Project, direction: Direction): Promise<Version[]> {
      const head = await headOf(project, direction);
      if (head === null) return [];
      const versions = await readVersions(project, [head]);
      return versions.filter((version) => version.directionId === direction.id);
    },

    get: getVersion,

    untrackedCount(project: Project): number | null {
      return untrackedCounts.get(project.id) ?? null;
    },

    status(project: Project, direction: Direction, paths?: string[]): Promise<WorkTreeStatus> {
      return locked(project, direction, () => statusOf(project, direction, paths));
    },

    async headFile(project: Project, direction: Direction, relativePath: string): Promise<Uint8Array | null> {
      const head = await headOf(project, direction);
      if (head === null) return null;
      try {
        return await runGitBuffer(repoScope(project), ['cat-file', 'blob', `${head}:${relativePath}`]);
      } catch {
        return null;
      }
    },

    discard(project: Project, direction: Direction): Promise<WorkTreeStatus> {
      return locked(project, direction, async () => {
        const head = await headOf(project, direction);
        const tree = head === null ? null : await treeOf(project, head);
        const kept = await Promise.all(layoutFilesOf(project).map(async (file) => ({ target: layoutOf(direction, file), bytes: await readFile(layoutOf(direction, file)).catch(() => null) })));
        await resetWorkTree(project, direction, tree, tree, 'trash');
        for (const { target, bytes } of kept) {
          if (!bytes) continue;
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, bytes);
        }
        return statusOf(project, direction);
      });
    },

    restore(project: Project, direction: Direction, versionId: string, kind: 'undo' | 'restore'): Promise<Version> {
      return locked(project, direction, async () => {
        const head = await headOf(project, direction);
        if (head === null) throw new BadRequestError(kind === 'undo' ? 'nothing to undo' : 'direction has no versions');
        let target: string;
        if (kind === 'undo') {
          const from = SHA_PATTERN.test(versionId) ? await requireCommit(project, versionId) : head;
          const fromInfo = await commitInfo(project, from);
          if (fromInfo.parentId === null) throw new BadRequestError('nothing to undo');
          target = fromInfo.parentId;
        } else {
          target = await requireCommit(project, versionId);
        }
        const tree = await treeOf(project, target);
        const headTree = await treeOf(project, head);
        const fast = project.app ? await direct.reset(project, direction, headTree, tree) : false;
        if (!fast) await resetWorkTree(project, direction, headTree, tree, 'keep');
        const title = restoreTitle(kind, await originTitleOf(project, target));
        const version = await commitTree(project, direction, tree, head, head, title, { kind, restoredFrom: target });
        if (fast) direct.moved(project, direction, head, version.id);
        return version;
      });
    },

    async sessionSince(project: Project, direction: Direction, baseVersionId: string): Promise<SessionSpan> {
      const { count, dirty, foreign, titles, outside } = await spanOf(project, direction, baseVersionId);
      return { count, dirty, foreign, titles, outside: outside.length };
    },

    endSession(project: Project, direction: Direction, baseVersionId: string, action: 'save' | 'discard', title: string, meta: VersionMeta): Promise<SessionEndResult> {
      return locked(project, direction, async () => {
        const span = await spanOf(project, direction, baseVersionId);
        if (span.foreign !== null) throw new ConflictError(span.foreign);
        if (span.head === span.base) return { version: null, head: span.base, changed: [] };
        const headTree = await treeOf(project, span.head);
        const baseTree = await treeOf(project, span.base);
        const { stdout } = await runGit(repoScope(project), ['diff-tree', '-r', '--name-only', '-z', span.base, span.head]);
        const changed = splitNul(stdout);
        if (span.outside.length > 0) {
          if (action === 'discard' && span.count > 0) return discardOwnOnly(project, direction, span, changed);
          return { version: null, head: span.head, changed: [] };
        }
        if (action === 'save' && span.dirty) {
          const version = await commitTree(project, direction, headTree, span.base, span.head, title, meta);
          return { version, head: version.id, changed };
        }
        if (action === 'discard' && span.dirty) await resetWorkTree(project, direction, headTree, baseTree, 'keep');
        await runGit(repoScope(project), ['update-ref', refOf(direction), span.base, span.head]);
        return { version: null, head: span.base, changed };
      });
    },

    async checkoutInto(project: Project, versionId: string, targetDir: string): Promise<void> {
      const sha = await requireCommit(project, versionId);
      await checkoutTo(project, sha, path.resolve(targetDir));
    },

    async snapshot(project: Project, versionId: string): Promise<string> {
      const sha = await requireCommit(project, versionId);
      const snapshotsDir = path.join(projectRoot(project), 'snapshots');
      const finalDir = path.join(snapshotsDir, sha);
      if (existsSync(finalDir)) return finalDir;
      return lock(`${project.id}/snapshot/${sha}`, async () => {
        if (existsSync(finalDir)) return finalDir;
        const tempDir = path.join(snapshotsDir, `.tmp-${sha}-${randomBytes(4).toString('hex')}`);
        try {
          await checkoutTo(project, sha, tempDir);
          await linkSnapshotModules(project, tempDir);
          await rename(tempDir, finalDir);
        } catch (error) {
          await rm(tempDir, { recursive: true, force: true });
          if (existsSync(finalDir)) return finalDir;
          throw error;
        }
        return finalDir;
      });
    },

    async exportZip(project: Project, versionId: string): Promise<Uint8Array> {
      const sha = await requireCommit(project, versionId);
      const excluded = NEVER_TRACKED.map((name) => `:(exclude)${name}`);
      return runGitBuffer(repoScope(project), ['archive', '--format=zip', sha, '--', '.', ...excluded]);
    },
  };
}
