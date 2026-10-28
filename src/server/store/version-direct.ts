import { readFile, rm, writeFile } from 'node:fs/promises';
import type { Direction, Project, WorkTreeStatus } from '../../shared/contracts.js';
import { comparePaths, type ObjectStore, type TreeEntry } from './git-objects.js';
import { FastPathUnavailable, checkWritable, diffTrees, lookupPath, readWorkFile, sameAsWork, updateTree, writeWorkFile, type FileChange } from './version-fast.js';

export interface DirectDeps {
  objects(project: Project): ObjectStore;
  headOf(project: Project, direction: Direction): Promise<string | null>;
  treeOf(project: Project, commit: string): Promise<string>;
  keyOf(project: Project, direction: Direction): string;
  neverTracked(project: Project): string[];
  staleMarkerOf(project: Project, direction: Direction): string;
  changedSinceScan(project: Project, direction: Direction): Promise<string[] | null>;
  ignored(project: Project, direction: Direction, paths: string[]): Promise<Set<string>>;
  stageGit(project: Project, direction: Direction, paths: string[]): Promise<void>;
  resetIndex(project: Project, direction: Direction, tree: string): Promise<void>;
}

interface StatusModel {
  head: string;
  changed: Set<string>;
}

export type DirectStatus = WorkTreeStatus | 'git' | 'full';

export interface DirectCommit {
  tree: string;
  changed: string[];
}

const GITIGNORE = /(^|\/)\.gitignore$/;

function statusOf(model: StatusModel): WorkTreeStatus {
  const changed = [...model.changed].sort(comparePaths);
  return { dirty: changed.length > 0, changed };
}

export function createDirectStore(deps: DirectDeps) {
  const models = new Map<string, StatusModel>();
  const unstaged = new Map<string, Set<string>>();

  const addUnstaged = (key: string, paths: Iterable<string>): void => {
    const set = unstaged.get(key) ?? new Set<string>();
    for (const relative of paths) set.add(relative);
    unstaged.set(key, set);
  };

  const scoped = (project: Project, paths: string[]): string[] => {
    const never = deps.neverTracked(project);
    return paths.filter((entry) => entry !== '' && !never.includes(entry.split('/')[0] ?? ''));
  };

  const classifyOne = async (project: Project, direction: Direction, tree: string, relative: string): Promise<'full' | 'dirty' | 'clean' | 'untracked'> => {
    if (GITIGNORE.test(relative)) return 'full';
    const entry = await lookupPath(deps.objects(project), tree, relative);
    const file = await readWorkFile(direction.workTree, relative);
    if (file === 'folder' || entry?.mode === '40000' || entry?.mode === '160000') return 'full';
    if (!entry) return file === 'missing' ? 'clean' : 'untracked';
    if (file === 'missing') return 'dirty';
    return sameAsWork(entry, file) ? 'clean' : 'dirty';
  };

  const classify = async (project: Project, direction: Direction, tree: string, paths: string[], model: StatusModel): Promise<'full' | null> => {
    const untracked: string[] = [];
    for (const relative of paths) {
      const kind = await classifyOne(project, direction, tree, relative);
      if (kind === 'full') return 'full';
      if (kind === 'untracked') untracked.push(relative);
      else if (kind === 'dirty') model.changed.add(relative);
      else model.changed.delete(relative);
    }
    if (untracked.length === 0) return null;
    const ignored = await deps.ignored(project, direction, untracked);
    for (const relative of untracked) {
      if (ignored.has(relative)) model.changed.delete(relative);
      else model.changed.add(relative);
    }
    return null;
  };

  const status = async (project: Project, direction: Direction, paths?: string[]): Promise<DirectStatus> => {
    const key = deps.keyOf(project, direction);
    const model = models.get(key);
    if (!model) return 'git';
    const head = await deps.headOf(project, direction);
    if (head !== model.head) {
      models.delete(key);
      return 'git';
    }
    const pending = paths ?? (await deps.changedSinceScan(project, direction));
    if (pending === null) {
      models.delete(key);
      return 'full';
    }
    const relevant = scoped(project, pending);
    addUnstaged(key, relevant);
    try {
      if ((await classify(project, direction, await deps.treeOf(project, head), relevant, model)) === 'full') {
        models.delete(key);
        return 'full';
      }
    } catch (error) {
      if (!(error instanceof FastPathUnavailable)) throw error;
      models.delete(key);
      return 'full';
    }
    return statusOf(model);
  };

  return {
    status,

    remember(project: Project, direction: Direction, head: string, changed: string[]): void {
      models.set(deps.keyOf(project, direction), { head, changed: new Set(changed) });
    },

    forget(project: Project, direction: Direction): void {
      models.delete(deps.keyOf(project, direction));
    },

    async syncIndex(project: Project, direction: Direction): Promise<void> {
      const key = deps.keyOf(project, direction);
      const marker = deps.staleMarkerOf(project, direction);
      const stale = (await readFile(marker, 'utf8').catch(() => '')).trim();
      if (stale !== '') {
        await deps.resetIndex(project, direction, stale);
        await rm(marker, { force: true });
      }
      const paths = unstaged.get(key);
      if (!paths || paths.size === 0) return;
      unstaged.delete(key);
      await deps.stageGit(project, direction, [...paths]);
    },

    async buildCommit(project: Project, direction: Direction, head: string, paths: string[]): Promise<DirectCommit | null> {
      const store = deps.objects(project);
      const headTree = await deps.treeOf(project, head);
      const changes = new Map<string, TreeEntry | null>();
      const changed: string[] = [];
      for (const relative of paths) {
        if (scoped(project, [relative]).length === 0) throw new FastPathUnavailable(`${relative} is never tracked`);
        const entry = await lookupPath(store, headTree, relative);
        const file = await readWorkFile(direction.workTree, relative);
        if (!entry || entry.mode === '40000' || entry.mode === '160000' || file === 'folder') throw new FastPathUnavailable(`${relative} needs git add`);
        if (file === 'missing') {
          changes.set(relative, null);
          changed.push(relative);
          continue;
        }
        if (sameAsWork(entry, file)) continue;
        changes.set(relative, { mode: file.mode, name: '', sha: await store.writeBlob(file.body) });
        changed.push(relative);
      }
      if (changes.size === 0) return null;
      const tree = (await updateTree(store, headTree, changes)) ?? '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
      return tree === headTree ? null : { tree, changed: changed.sort(comparePaths) };
    },

    committed(project: Project, direction: Direction, oldHead: string, newHead: string, paths: string[]): void {
      const key = deps.keyOf(project, direction);
      addUnstaged(key, paths);
      const model = models.get(key);
      if (!model || model.head !== oldHead) return;
      model.head = newHead;
      for (const relative of paths) model.changed.delete(relative);
    },

    async reset(project: Project, direction: Direction, fromTree: string, toTree: string): Promise<boolean> {
      const current = await status(project, direction);
      if (typeof current === 'string') return false;
      const key = deps.keyOf(project, direction);
      const model = models.get(key);
      if (!model) return false;
      const store = deps.objects(project);
      const moves = await diffTrees(store, fromTree, toTree);
      const listed = new Set(moves.map((change) => change.path));
      const local: FileChange[] = [];
      for (const relative of model.changed) {
        if (listed.has(relative) || !(await lookupPath(store, fromTree, relative).catch(() => null))) continue;
        local.push({ path: relative, entry: await lookupPath(store, toTree, relative) });
      }
      const changes = [...moves, ...local];
      if (scoped(project, changes.map((change) => change.path)).length !== changes.length) return false;
      try {
        await checkWritable(direction.workTree, changes);
      } catch (error) {
        if (error instanceof FastPathUnavailable) return false;
        throw error;
      }
      await writeFile(deps.staleMarkerOf(project, direction), `${toTree}\n`);
      for (const change of changes) await writeWorkFile(store, direction.workTree, change);
      addUnstaged(key, changes.map((change) => change.path));
      for (const change of changes) model.changed.delete(change.path);
      return true;
    },

    moved(project: Project, direction: Direction, oldHead: string, newHead: string): void {
      const model = models.get(deps.keyOf(project, direction));
      if (model && model.head === oldHead) model.head = newHead;
    },
  };
}

export type DirectStore = ReturnType<typeof createDirectStore>;
