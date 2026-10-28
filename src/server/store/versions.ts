import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, lstat, mkdir, readFile, realpath, rename, rm, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CANVAS_FILE } from '../../shared/canvas-file.js';
import { LINKS_FILE } from '../../shared/links.js';
import type { Direction, Project, Version, VersionMeta, WorkTreeStatus } from '../../shared/contracts.js';
import { baseTitle, isRestoreKind, restoreTitle } from '../../shared/version-title.js';
import type { ServerConfig, SessionEndResult, SessionSpan, VersionStore } from '../types.js';
import { BadRequestError, ConflictError, NotFoundError, assertSafeId } from './errors.js';
import { createKeyedMutex } from './mutex.js';

export const GIT_EXCLUDES = ['node_modules', 'node_modules/', 'dist/', '.vite/', '.next/', '.turbo/', '.studio/*', `!${CANVAS_FILE}`, `!${LINKS_FILE}`, '.DS_Store'];
const LAYOUT_FILES = [CANVAS_FILE, LINKS_FILE];
const NEVER_TRACKED = ['node_modules'];
const MAX_SCOPED_PATHS = 500;
const APP_MAX_TRACKED_BYTES = 2 * 1024 * 1024;
const APP_EXCLUDES = ['*.onnx', '*.mlmodelc/', '*.mlpackage/', '*.sqlite', '*.db', '*.m4a', '*.mp3', '*.wav', '*.mp4', '*.mov', '*.zip', '*.tar', '*.tgz', '*.gz', '.env', '.env.*', '!.env.example', '*.pem', '*.key'];

const META_PREFIX = 'studio-meta: ';
const MAX_ORIGIN_DEPTH = 64;
const FIELD = '\x1f';
const RECORD = '\x1e';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const ZERO_SHA = '0'.repeat(40);
const FORCED_KINDS = new Set<VersionMeta['kind']>(['fork', 'undo', 'restore']);

interface StoredVersionMeta extends VersionMeta {
  directionId: string;
  createdAt: number;
}

interface GitScope {
  gitDir: string;
  workTree?: string;
  indexFile?: string;
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

async function runGit(scope: GitScope, args: string[], options: { cwd?: string } = {}): Promise<GitResult> {
  const binary = await resolveGitBinary();
  return new Promise((resolve, reject) => {
    execFile(
      binary,
      args,
      { env: gitEnv(scope), cwd: options.cwd ?? scope.workTree ?? scope.gitDir, maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`git ${args[0] ?? ''} failed: ${stderr.trim() || error.message}`));
          return;
        }
        resolve({ stdout });
      },
    );
  });
}

async function runGitBuffer(scope: GitScope, args: string[]): Promise<Uint8Array> {
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

function toVersion(sha: string, parents: string, committedAt: string, message: string, changedFiles: string[]): Version {
  const { title, meta } = parseCommitMessage(message);
  const parentId = parents.trim().split(' ').filter(Boolean)[0] ?? null;
  const publicMeta: VersionMeta = { kind: meta?.kind ?? 'manual' };
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

  const largeUntracked = async (project: Project): Promise<string[]> => {
    const main = project.directions[0];
    if (!main) return [];
    const { stdout } = await runGit(directionScope(project, main), ['ls-files', '--others', '--exclude-standard', '-z']);
    const large: string[] = [];
    for (const relative of splitNul(stdout)) {
      const info = await stat(path.join(main.workTree, relative)).catch(() => null);
      if (info && info.size > APP_MAX_TRACKED_BYTES) large.push(`/${relative.replace(/([*?[\]\\!#])/g, '\\$1')}`);
    }
    return large;
  };

  const writeExclude = async (project: Project): Promise<void> => {
    const infoDir = path.join(gitDirOf(project), 'info');
    await mkdir(infoDir, { recursive: true });
    const base = project.app ? [...GIT_EXCLUDES, ...APP_EXCLUDES] : GIT_EXCLUDES;
    await writeFile(path.join(infoDir, 'exclude'), `${base.join('\n')}\n`);
    if (project.app) {
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
  });
  const refOf = (direction: Direction): string => `refs/heads/${direction.branch}`;
  const lockKey = (project: Project, direction: Direction): string => `${project.id}/${direction.id}`;

  const resolveRef = async (project: Project, ref: string): Promise<string | null> => {
    try {
      const { stdout } = await runGit(repoScope(project), ['rev-parse', '--verify', '-q', `${ref}^{commit}`]);
      const sha = stdout.trim();
      return sha === '' ? null : sha;
    } catch {
      return null;
    }
  };

  const requireCommit = async (project: Project, versionId: string): Promise<string> => {
    if (!SHA_PATTERN.test(versionId)) throw new BadRequestError('invalid versionId');
    const sha = await resolveRef(project, versionId);
    if (sha === null) throw new NotFoundError(`version ${versionId} not found`);
    return sha;
  };

  const treeOf = async (project: Project, commit: string): Promise<string> => {
    const { stdout } = await runGit(repoScope(project), ['rev-parse', `${commit}^{tree}`]);
    return stdout.trim();
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
    const { stdout } = await runGit(repoScope(project), ['log', '-n', '1', '--format=%P%x1f%B', sha, '--']);
    const [parents = '', message = ''] = stdout.split(FIELD);
    const parsed = parseCommitMessage(message);
    return {
      parentId: parents.trim().split(' ').filter(Boolean)[0] ?? null,
      title: parsed.title,
      meta: parsed.meta,
    };
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
    await runGit(scope, ['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', ...NEVER_TRACKED]);
  };

  const stageAll = async (scope: GitScope): Promise<void> => {
    await runGit(scope, ['add', '-A', '--', '.']);
    await untrackNeverTracked(scope);
  };

  const stagePaths = async (scope: GitScope, paths: string[] | undefined): Promise<void> => {
    const scoped = (paths ?? []).filter((entry) => entry !== '' && !NEVER_TRACKED.includes(entry.split('/')[0] ?? ''));
    if (paths === undefined || scoped.length > MAX_SCOPED_PATHS) {
      await stageAll(scope);
      return;
    }
    if (scoped.length === 0) return;
    try {
      await runGit(scope, ['--literal-pathspecs', 'add', '-A', '--', ...scoped]);
    } catch {
      await stageAll(scope);
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
  ): Promise<Version> => {
    const stored: StoredVersionMeta = { ...meta, directionId: direction.id, createdAt: Date.now() };
    const cleanTitle = title.replace(/\s+/g, ' ').trim() || meta.kind;
    const message = `${cleanTitle}\n\n${META_PREFIX}${JSON.stringify(stored)}\n`;
    const args = ['commit-tree', tree];
    if (parent !== null) args.push('-p', parent);
    args.push('-m', message);
    const { stdout } = await runGit(repoScope(project), args);
    const sha = stdout.trim();
    await runGit(repoScope(project), ['update-ref', refOf(direction), sha, currentHead ?? ZERO_SHA]);
    const changedFiles = await changedFilesOf(project, sha, parent !== null);
    return toVersion(sha, parent ?? '', String(Math.floor(stored.createdAt / 1000)), message, changedFiles);
  };

  const headOf = async (project: Project, direction: Direction): Promise<string | null> =>
    resolveRef(project, refOf(direction));

  const isAncestor = async (project: Project, base: string, head: string): Promise<boolean> => {
    try {
      await runGit(repoScope(project), ['merge-base', '--is-ancestor', base, head]);
      return true;
    } catch {
      return false;
    }
  };

  const spanOf = async (project: Project, direction: Direction, baseVersionId: string): Promise<SessionSpan & { base: string; head: string }> => {
    const base = await requireCommit(project, baseVersionId);
    const head = await headOf(project, direction);
    if (head === null || !(await isAncestor(project, base, head))) {
      return { base, head: head ?? base, count: 0, dirty: false, foreign: 'This design changed outside the edit session.', titles: [] };
    }
    if (head === base) return { base, head, count: 0, dirty: false, foreign: null, titles: [] };
    const span = await readVersions(project, [`${base}..${head}`]);
    const other = span.find((version) => version.meta.kind !== 'manual');
    const foreign = other ? `"${other.title}" happened during the edit session.` : null;
    const dirty = (await treeOf(project, head)) !== (await treeOf(project, base));
    return { base, head, count: span.length, dirty, foreign, titles: span.map((version) => version.title).reverse() };
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
    await stagePaths(scope, paths);
    const head = await headOf(project, direction);
    const { stdout } = head
      ? await runGit(scope, ['diff-index', '--cached', '--name-only', '-z', head])
      : await runGit(scope, ['ls-files', '-z']);
    const changed = splitNul(stdout).filter((entry) => !LAYOUT_FILES.includes(entry));
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
      await writeExclude(project);
    },

    commitFile(project: Project, direction: Direction, relative: string | string[], title: string, meta: VersionMeta): Promise<Version | null> {
      const listed = Array.isArray(relative) ? relative : [relative];
      const paths = [...listed, ...LAYOUT_FILES.filter((file) => !listed.includes(file) && existsSync(layoutOf(direction, file)))];
      return lock(lockKey(project, direction), async () => {
        const head = await headOf(project, direction);
        const tempIndex = path.join(gitDirOf(project), `index-file-${randomBytes(6).toString('hex')}`);
        const tempScope: GitScope = { ...directionScope(project, direction), indexFile: tempIndex };
        try {
          await runGit(tempScope, head === null ? ['read-tree', '--empty'] : ['read-tree', head]);
          await runGit(tempScope, ['--literal-pathspecs', 'add', '-A', '--', ...paths]);
          const tree = (await runGit(tempScope, ['write-tree'])).stdout.trim();
          if (head !== null && (await treeOf(project, head)) === tree) return null;
          const version = await commitTree(project, direction, tree, head, head, title, meta);
          await runGit(directionScope(project, direction), ['--literal-pathspecs', 'add', '-A', '--', ...paths]);
          return version;
        } finally {
          await rm(tempIndex, { force: true });
        }
      });
    },

    commit(project: Project, direction: Direction, title: string, meta: VersionMeta): Promise<Version | null> {
      return lock(lockKey(project, direction), async () => {
        await refreshExclude(project);
        const scope = directionScope(project, direction);
        await stageAll(scope);
        const { stdout } = await runGit(scope, ['write-tree']);
        const tree = stdout.trim();
        const head = await headOf(project, direction);
        const parent = head ?? (direction.parentVersionId ? await requireCommit(project, direction.parentVersionId) : null);
        if (parent !== null && !FORCED_KINDS.has(meta.kind) && (await treeOf(project, parent)) === tree) return null;
        return commitTree(project, direction, tree, parent, head, title, meta);
      });
    },

    async list(project: Project, direction: Direction): Promise<Version[]> {
      const head = await headOf(project, direction);
      if (head === null) return [];
      const versions = await readVersions(project, [head]);
      return versions.filter((version) => version.directionId === direction.id);
    },

    get: getVersion,

    status(project: Project, direction: Direction, paths?: string[]): Promise<WorkTreeStatus> {
      return lock(lockKey(project, direction), () => statusOf(project, direction, paths));
    },

    discard(project: Project, direction: Direction): Promise<WorkTreeStatus> {
      return lock(lockKey(project, direction), async () => {
        const head = await headOf(project, direction);
        const tree = head === null ? null : await treeOf(project, head);
        const kept = await Promise.all(LAYOUT_FILES.map(async (file) => ({ target: layoutOf(direction, file), bytes: await readFile(layoutOf(direction, file)).catch(() => null) })));
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
      return lock(lockKey(project, direction), async () => {
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
        await resetWorkTree(project, direction, await treeOf(project, head), tree, 'keep');
        const title = restoreTitle(kind, await originTitleOf(project, target));
        return commitTree(project, direction, tree, head, head, title, { kind, restoredFrom: target });
      });
    },

    async sessionSince(project: Project, direction: Direction, baseVersionId: string): Promise<SessionSpan> {
      const { count, dirty, foreign, titles } = await spanOf(project, direction, baseVersionId);
      return { count, dirty, foreign, titles };
    },

    endSession(project: Project, direction: Direction, baseVersionId: string, action: 'save' | 'discard', title: string, meta: VersionMeta): Promise<SessionEndResult> {
      return lock(lockKey(project, direction), async () => {
        const span = await spanOf(project, direction, baseVersionId);
        if (span.foreign !== null) throw new ConflictError(span.foreign);
        if (span.head === span.base) return { version: null, head: span.base, changed: [] };
        const headTree = await treeOf(project, span.head);
        const baseTree = await treeOf(project, span.base);
        const { stdout } = await runGit(repoScope(project), ['diff-tree', '-r', '--name-only', '-z', span.base, span.head]);
        const changed = splitNul(stdout);
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
