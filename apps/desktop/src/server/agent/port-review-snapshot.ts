import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
  stat,
  utimes,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadConfig } from "../platform/config/index.js";
import { userGit } from "../platform/git/index.js";

interface RouteSnapshot {
  readonly tree: string;
  readonly workTree: string;
}

interface TreeChange {
  readonly file: string;
  readonly status: string;
}

interface AppGit {
  readonly gitDir: string;
  readonly objects: string;
  readonly storeRoot: string;
}

interface StoreAge {
  readonly at: number;
  readonly dir: string;
}

type ObjectEnvKey = "GIT_ALTERNATE_OBJECT_DIRECTORIES" | "GIT_OBJECT_DIRECTORY";

type ObjectEnv = Readonly<Record<ObjectEnvKey, string>>;

const ADD_TIMEOUT_MS = 60_000;

const ADDED = "A";

const APP_KEY_LENGTH = 16;

const STORE_CAP = 6;

const PENDING_PREFIX = "pending-";

const PENDING_MAX_AGE_MS = 3_600_000;

const START_TAG = /<port-start\b[^>]*\btree="(?<tree>[\da-f]+)"/u;

const toAppKey = (objects: string): string =>
  createHash("sha256").update(objects).digest("hex").slice(0, APP_KEY_LENGTH);

const toAppGit = async (workTree: string): Promise<AppGit | null> => {
  const found = await userGit(
    workTree,
    ["rev-parse", "--absolute-git-dir", "--git-path", "objects"],
    { allowFail: true }
  );

  if (found.code !== 0) {
    return null;
  }

  const [gitDir = "", objectsPath = ""] = found.stdout.trim().split("\n");

  if (gitDir === "" || objectsPath === "") {
    return null;
  }

  const objects = path.resolve(workTree, objectsPath);

  const storeRoot = path.join(
    loadConfig().dataDir,
    "port-objects",
    toAppKey(objects)
  );

  return { gitDir, objects, storeRoot };
};

const toObjectEnv = (app: AppGit, store: string): ObjectEnv => ({
  GIT_ALTERNATE_OBJECT_DIRECTORIES: app.objects,
  GIT_OBJECT_DIRECTORY: path.join(store, "objects"),
});

const toTreeStore = (app: AppGit, tree: string): string =>
  path.join(app.storeRoot, tree);

const createIndexCopy = async (from: string, to: string): Promise<boolean> => {
  try {
    await copyFile(from, to);

    return true;
  } catch {
    return false;
  }
};

const createTree = async (
  workTree: string,
  app: AppGit,
  store: string
): Promise<string | null> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "port-snapshot-"));
  const index = path.join(dir, "index");
  const indexEnv = { ...toObjectEnv(app, store), GIT_INDEX_FILE: index };

  try {
    await mkdir(indexEnv.GIT_OBJECT_DIRECTORY, { recursive: true });
    await createIndexCopy(path.join(app.gitDir, "index"), index);

    const added = await userGit(workTree, ["add", "-A"], {
      allowFail: true,
      env: indexEnv,
      timeoutMs: ADD_TIMEOUT_MS,
    });

    if (added.code !== 0) {
      return null;
    }

    const written = await userGit(workTree, ["write-tree"], {
      allowFail: true,
      env: indexEnv,
    });

    if (written.code !== 0) {
      return null;
    }

    return written.stdout.trim();
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
};

const toStoreAge = async (dir: string): Promise<StoreAge | null> => {
  try {
    const found = await stat(dir);

    return { at: found.mtimeMs, dir };
  } catch {
    return null;
  }
};

const deleteStores = async (ages: readonly StoreAge[]): Promise<void> => {
  await Promise.all(
    ages.map((age) => rm(age.dir, { force: true, recursive: true }))
  );
};

const toStoreAges = async (dirs: readonly string[]): Promise<StoreAge[]> => {
  const ages = await Promise.all(dirs.map((dir) => toStoreAge(dir)));

  return ages.filter((age): age is StoreAge => age !== null);
};

const deleteOldStores = async (app: AppGit): Promise<void> => {
  const names = await readdir(app.storeRoot);

  const dirs: string[] = [];
  const pendings: string[] = [];

  for (const name of names) {
    if (name.startsWith(PENDING_PREFIX)) {
      pendings.push(path.join(app.storeRoot, name));
    } else {
      dirs.push(path.join(app.storeRoot, name));
    }
  }

  const [ages, pendingAges] = await Promise.all([
    toStoreAges(dirs),
    toStoreAges(pendings),
  ]);

  const staleAt = Date.now() - PENDING_MAX_AGE_MS;

  const old = ages
    .toSorted((left, right) => right.at - left.at)
    .slice(STORE_CAP);

  const stale = pendingAges.filter((age) => age.at < staleAt);

  await deleteStores([...old, ...stale]);
};

const moveStore = async (pending: string, store: string): Promise<boolean> => {
  try {
    await rename(pending, store);
  } catch {
    if ((await toStoreAge(store)) === null) {
      return false;
    }
  }

  const now = new Date();

  await utimes(store, now, now);

  return true;
};

const createRouteSnapshot = async (
  workTree: string
): Promise<RouteSnapshot | null> => {
  try {
    const app = await toAppGit(workTree);

    if (app === null) {
      return null;
    }

    const pending = path.join(
      app.storeRoot,
      `${PENDING_PREFIX}${randomUUID()}`
    );

    try {
      const tree = await createTree(workTree, app, pending);

      if (tree === null) {
        return null;
      }

      if (!(await moveStore(pending, toTreeStore(app, tree)))) {
        return null;
      }

      await deleteOldStores(app);

      return { tree, workTree };
    } finally {
      await rm(pending, { force: true, recursive: true });
    }
  } catch {
    return null;
  }
};

const toTreeChanges = (text: string): TreeChange[] => {
  const parts = text.split("\0").filter((part) => part !== "");
  const changes: TreeChange[] = [];

  for (let at = 0; at + 1 < parts.length; at += 2) {
    changes.push({ file: parts[at + 1] ?? "", status: parts[at] ?? "" });
  }

  return changes;
};

const listTreeChanges = async (
  snapshot: RouteSnapshot,
  tree: string,
  env: ObjectEnv
): Promise<TreeChange[] | null> => {
  const found = await userGit(
    snapshot.workTree,
    [
      "diff-tree",
      "-r",
      "-z",
      "--no-renames",
      "--name-status",
      "--relative",
      snapshot.tree,
      tree,
    ],
    { allowFail: true, env }
  );

  if (found.code !== 0) {
    return null;
  }

  return toTreeChanges(found.stdout);
};

const restoreFiles = async (
  snapshot: RouteSnapshot,
  files: readonly string[],
  env: ObjectEnv
): Promise<boolean> => {
  if (files.length === 0) {
    return true;
  }

  const restored = await userGit(
    snapshot.workTree,
    ["restore", `--source=${snapshot.tree}`, "--worktree", "--", ...files],
    { allowFail: true, env }
  );

  return restored.code === 0;
};

const deleteFiles = async (
  snapshot: RouteSnapshot,
  files: readonly string[]
): Promise<void> => {
  await Promise.all(
    files.map((file) => rm(path.join(snapshot.workTree, file), { force: true }))
  );
};

const restoreRouteSnapshot = async (
  snapshot: RouteSnapshot
): Promise<boolean> => {
  try {
    const app = await toAppGit(snapshot.workTree);

    if (app === null) {
      return false;
    }

    const store = toTreeStore(app, snapshot.tree);
    const now = await createTree(snapshot.workTree, app, store);

    if (now === null) {
      return false;
    }

    const env = toObjectEnv(app, store);
    const changes = await listTreeChanges(snapshot, now, env);

    if (changes === null) {
      return false;
    }

    const added = changes.filter((change) => change.status === ADDED);
    const changed = changes.filter((change) => change.status !== ADDED);

    await deleteFiles(
      snapshot,
      added.map((change) => change.file)
    );

    return await restoreFiles(
      snapshot,
      changed.map((change) => change.file),
      env
    );
  } catch {
    return false;
  }
};

const toStartTag = async (workTree: string): Promise<string> => {
  const snapshot = await createRouteSnapshot(workTree);

  if (snapshot === null) {
    return "";
  }

  return ["\n\n<", `port-start tree="${snapshot.tree}" />`].join("");
};

const toStartSnapshot = (
  prompt: string,
  workTree: string
): RouteSnapshot | null => {
  const tree = START_TAG.exec(prompt)?.groups?.["tree"] ?? null;

  if (tree === null) {
    return null;
  }

  return { tree, workTree };
};

const listChangedFiles = async (
  snapshot: RouteSnapshot,
  tree: string,
  env: ObjectEnv
): Promise<string[] | null> => {
  const found = await userGit(
    snapshot.workTree,
    [
      "diff-tree",
      "-r",
      "-z",
      "--no-renames",
      "--name-only",
      "--relative",
      snapshot.tree,
      tree,
    ],
    { allowFail: true, env }
  );

  if (found.code !== 0) {
    return null;
  }

  return found.stdout.split("\0").filter((file) => file !== "");
};

const hasRouteChange = async (
  snapshot: RouteSnapshot,
  files: readonly string[]
): Promise<boolean> => {
  try {
    const app = await toAppGit(snapshot.workTree);

    if (app === null) {
      return false;
    }

    const store = toTreeStore(app, snapshot.tree);
    const now = await createTree(snapshot.workTree, app, store);

    if (now === null) {
      return false;
    }

    const changed = new Set(
      await listChangedFiles(snapshot, now, toObjectEnv(app, store))
    );

    return files.some((file) => changed.has(file));
  } catch {
    return false;
  }
};

export {
  createRouteSnapshot,
  hasRouteChange,
  restoreRouteSnapshot,
  toStartSnapshot,
  toStartTag,
};

export type { RouteSnapshot };
