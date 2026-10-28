import { readFile, rm, writeFile } from 'node:fs/promises';
import type { Direction, Project, WorkTreeStatus } from '../../shared/contracts.js';
import { comparePaths, type ObjectStore, type TreeEntry } from './git-objects.js';
import { FastPathUnavailable, checkWritable, diffTrees, filesUnder, lookupPath, readWorkFile, sameAsWork, updateTree, writeWorkFile, type FileChange } from './version-fast.js';

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
const NEW_FOLDER_LIMIT = 200;

type PathKind = 'full' | 'dirty' | 'clean' | 'untracked' | 'new-folder';

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

  const classifyOne = async (project: Project, direction: Direction, tree: string, relative: string): Promise<PathKind> => {
    if (GITIGNORE.test(relative)) return 'full';
    const entry = await lookupPath(deps.objects(project), tree, relative);
    const file = await readWorkFile(direction.workTree, relative);
    if (file === 'folder' && !entry) return 'new-folder';
    if (file === 'folder' || entry?.mode === '40000' || entry?.mode === '160000') return 'full';
    if (!entry) return file === 'missing' ? 'clean' : 'untracked';
    if (file === 'missing') return 'dirty';
    return sameAsWork(entry, file) ? 'clean' : 'dirty';
  };

  const dropUnder = (model: StatusModel, folder: string): void => {
    for (const known of model.changed) if (known.startsWith(`${folder}/`)) model.changed.delete(known);
  };

  const newFolderFiles = async (project: Project, direction: Direction, relative: string, model: StatusModel): Promise<string[] | null> => {
    const files = await filesUnder(direction.workTree, relative, NEW_FOLDER_LIMIT);
    if (files === null || files.some((file) => GITIGNORE.test(file))) return null;
    dropUnder(model, relative);
    return scoped(project, files);
  };

  const classify = async (project: Project, direction: Direction, tree: string, paths: string[], model: StatusModel): Promise<'full' | null> => {
    const untracked: string[] = [];
    for (const relative of paths) {
      const kind = await classifyOne(project, direction, tree, relative);
      if (kind === 'full') return 'full';
      if (kind === 'new-folder') {
        const files = await newFolderFiles(project, direction, relative, model);
        if (files === null) return 'full';
        untracked.push(...files);
      } else if (kind === 'untracked') untracked.push(relative);
      else if (kind === 'dirty') model.changed.add(relative);
      else {
        model.changed.delete(relative);
        dropUnder(model, relative);
      }
    }
    if (untracked.length === 0) return null;
    const ignored = await deps.ignored(project, direction, untracked);
    for (const relative of untracked) {
      if (ignored.has(relative)) model.changed.delete(relative);
      else model.changed.add(relative);
    }
    return null;
  };

  const reclassify = async (project: Project, direction: Direction, head: string, paths: string[], model: StatusModel): Promise<boolean> => {
    try {
      return (await classify(project, direction, await deps.treeOf(project, head), paths, model)) !== 'full';
    } catch (error) {
      if (!(error instanceof FastPathUnavailable)) throw error;
      return false;
    }
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
    if (!(await reclassify(project, direction, head, relevant, model))) {
      models.delete(key);
      return 'full';
    }
    return statusOf(model);
  };

  const reset = async (project: Project, direction: Direction, fromTree: string, toTree: string): Promise<boolean> => {
    const current = await status(project, direction);
    if (typeof current === 'string') return false;
    const model = models.get(deps.keyOf(project, direction));
    return model ? resetModel(project, direction, model, fromTree, toTree) : false;
  };

  const resetModel = async (project: Project, direction: Direction, model: StatusModel, fromTree: string, toTree: string): Promise<boolean> => {
    const key = deps.keyOf(project, direction);
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
  };

  const untrackedIn = async (project: Project, tree: string, model: StatusModel): Promise<string[] | null> => {
    const store = deps.objects(project);
    const found: string[] = [];
    try {
      for (const relative of model.changed) if (!(await lookupPath(store, tree, relative))) found.push(relative);
    } catch (error) {
      if (error instanceof FastPathUnavailable) return null;
      throw error;
    }
    return found;
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

    reset,

    async discard(project: Project, direction: Direction, tree: string, trash: (paths: string[]) => Promise<void>): Promise<WorkTreeStatus | null> {
      if (typeof (await status(project, direction)) === 'string') return null;
      const model = models.get(deps.keyOf(project, direction));
      const untracked = model ? await untrackedIn(project, tree, model) : null;
      if (!model || untracked === null || !(await resetModel(project, direction, model, tree, tree))) return null;
      await trash(untracked);
      for (const relative of untracked) model.changed.delete(relative);
      return statusOf(model);
    },

    has(project: Project, direction: Direction): boolean {
      return models.has(deps.keyOf(project, direction));
    },

    async adopt(project: Project, direction: Direction, scannedHead: string, head: string, changed: string[]): Promise<boolean> {
      const key = deps.keyOf(project, direction);
      const model: StatusModel = { head, changed: new Set(scoped(project, changed)) };
      addUnstaged(key, model.changed);
      if (scannedHead !== head) {
        const store = deps.objects(project);
        const moved = await diffTrees(store, await deps.treeOf(project, scannedHead), await deps.treeOf(project, head));
        const recheck = [...new Set([...model.changed, ...moved.map((change) => change.path)])];
        addUnstaged(key, recheck);
        if (!(await reclassify(project, direction, head, recheck, model))) return false;
      }
      models.set(key, model);
      return true;
    },

    moved(project: Project, direction: Direction, oldHead: string, newHead: string): void {
      const model = models.get(deps.keyOf(project, direction));
      if (model && model.head === oldHead) model.head = newHead;
    },
  };
}

export type DirectStore = ReturnType<typeof createDirectStore>;
