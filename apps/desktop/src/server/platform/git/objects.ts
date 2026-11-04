import { randomBytes } from "node:crypto";
import type { FileHandle } from "node:fs/promises";
import {
  appendFile,
  link,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { deflate } from "node:zlib";

import { isNodeError } from "../errors/node-error.js";
import { BatchReader } from "./batch-reader.js";
import type { BinaryResolver, RawObject } from "./batch-reader.js";
import {
  gitHash,
  identTime,
  parseCommit,
  parseTree,
  serializeTree,
  sortTree,
} from "./encoding.js";
import type { CommitInfo, TreeEntry } from "./encoding.js";
import { fileExists } from "./file-exists.js";
import { RefConflictError } from "./ref-conflict.js";

const SHA_HEX_LENGTH = 40;
const ZERO_SHA = "0".repeat(SHA_HEX_LENGTH);
const MAX_CACHED = 20_000;
const TEMP_SUFFIX_BYTES = 6;
const READ_ONLY_MODE = 0o444;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;

const deflateAsync = promisify(deflate);

const remember = <Value>(
  map: Map<string, Value>,
  sha: string,
  value: Value
): Value => {
  if (map.size > MAX_CACHED) {
    map.clear();
  }

  map.set(sha, value);

  return value;
};

const readText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const closeQuietly = async (handle: FileHandle): Promise<boolean> => {
  try {
    await handle.close();

    return true;
  } catch {
    return false;
  }
};

const openLock = async (lock: string, ref: string): Promise<FileHandle> => {
  try {
    return await open(lock, "wx");
  } catch {
    throw new RefConflictError(`${ref} is locked`);
  }
};

const linkOnce = async (temp: string, target: string): Promise<void> => {
  try {
    await link(temp, target);
  } catch (error) {
    if (!isNodeError(error) || error.code !== "EEXIST") {
      throw error;
    }
  }
};

const packedRef = (packed: string, ref: string): string | null => {
  const line = packed.split("\n").find((entry) => entry.endsWith(` ${ref}`));

  if (!line) {
    return null;
  }

  return line.slice(0, SHA_HEX_LENGTH);
};

const looseRef = (loose: string): string | null => {
  const value = loose.trim();

  if (SHA_PATTERN.test(value)) {
    return value;
  }

  return null;
};

const commitBody = (
  tree: string,
  parents: readonly string[],
  author: string,
  message: string
): Buffer => {
  const header = [
    `tree ${tree}`,
    ...parents.map((parent) => `parent ${parent}`),
    `author ${author}`,
    `committer ${author}`,
  ].join("\n");

  return Buffer.from(`${header}\n\n${message}`);
};

const storeLoose = async (
  dir: string,
  target: string,
  type: string,
  body: Buffer
): Promise<void> => {
  await mkdir(dir, { recursive: true });

  const suffix = randomBytes(TEMP_SUFFIX_BYTES).toString("hex");
  const temp = path.join(dir, `tmp_obj_${suffix}`);
  const header = Buffer.from(`${type} ${String(body.length)}\0`);

  await writeFile(
    temp,
    await deflateAsync(Buffer.concat([header, body]), { level: 1 }),
    { mode: READ_ONLY_MODE }
  );
  await linkOnce(temp, target);
  await rm(temp, { force: true });
};

class ObjectStore {
  public readonly gitDir: string;
  private readonly commits = new Map<string, CommitInfo>();
  private readonly reader: BatchReader;
  private readonly trees = new Map<string, TreeEntry[]>();

  public constructor(
    gitDir: string,
    binary: BinaryResolver,
    env: NodeJS.ProcessEnv
  ) {
    this.gitDir = gitDir;
    this.reader = new BatchReader(binary, env, gitDir);
  }

  public close(): void {
    this.reader.close();
  }

  public readObject(sha: string): Promise<RawObject | null> {
    return this.reader.read(sha);
  }

  public async readBlob(sha: string): Promise<Buffer> {
    const object = await this.reader.read(sha);

    if (!object || object.type !== "blob") {
      throw new Error(`blob ${sha} not found`);
    }

    return object.body;
  }

  public async readTree(sha: string): Promise<TreeEntry[]> {
    const known = this.trees.get(sha);

    if (known) {
      return known;
    }

    const object = await this.reader.read(sha);

    if (!object || object.type !== "tree") {
      throw new Error(`tree ${sha} not found`);
    }

    return remember(this.trees, sha, parseTree(object.body));
  }

  public async readCommit(sha: string): Promise<CommitInfo | null> {
    const known = this.commits.get(sha);

    if (known) {
      return known;
    }

    const object = await this.reader.read(sha);

    if (!object || object.type !== "commit") {
      return null;
    }

    return remember(this.commits, sha, parseCommit(object.body));
  }

  public writeBlob(body: Buffer): Promise<string> {
    return this.writeLoose("blob", body);
  }

  public async writeTree(entries: TreeEntry[]): Promise<string> {
    const sha = await this.writeLoose("tree", serializeTree(entries));

    remember(this.trees, sha, sortTree(entries));

    return sha;
  }

  public async writeCommit(
    tree: string,
    parents: string[],
    author: string,
    message: string
  ): Promise<string> {
    const body = commitBody(tree, parents, author, message);
    const sha = await this.writeLoose("commit", body);

    remember(this.commits, sha, {
      committedAt: identTime(author),
      message,
      parents,
      tree,
    });

    return sha;
  }

  public async readRef(ref: string): Promise<string | null> {
    const loose = await readText(path.join(this.gitDir, ref));

    if (loose !== null) {
      return looseRef(loose);
    }

    const packed = await readText(path.join(this.gitDir, "packed-refs"));

    return packedRef(packed ?? "", ref);
  }

  public async updateRef(
    ref: string,
    next: string,
    expected: string | null,
    ident: string
  ): Promise<void> {
    const target = path.join(this.gitDir, ref);

    await mkdir(path.dirname(target), { recursive: true });

    const lock = `${target}.lock`;
    const handle = await openLock(lock, ref);

    try {
      const current = await this.readRef(ref);

      if (current !== expected) {
        throw new RefConflictError(`${ref} moved`);
      }

      await handle.writeFile(`${next}\n`);
      await handle.close();
      await rename(lock, target);
    } catch (error) {
      await closeQuietly(handle);
      await rm(lock, { force: true });
      throw error;
    }

    const log = path.join(this.gitDir, "logs", ref);

    if (await fileExists(log)) {
      await appendFile(log, `${expected ?? ZERO_SHA} ${next} ${ident}\n`);
    }
  }

  private async writeLoose(type: string, body: Buffer): Promise<string> {
    const sha = gitHash(type, body);
    const dir = path.join(this.gitDir, "objects", sha.slice(0, 2));
    const target = path.join(dir, sha.slice(2));

    if (!(await fileExists(target))) {
      await storeLoose(dir, target, type, body);
    }

    return sha;
  }
}

export { ObjectStore };

export {
  GITLINK_MODE,
  SYMLINK_MODE,
  TREE_MODE,
  blobShaOf,
  comparePaths,
  gitIdent,
  sortTree,
} from "./encoding.js";

export { RefConflictError } from "./ref-conflict.js";

export type { CommitInfo, TreeEntry } from "./encoding.js";
