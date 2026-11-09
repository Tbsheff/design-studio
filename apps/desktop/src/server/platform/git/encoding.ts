import { createHash } from "node:crypto";

interface TreeEntry {
  mode: string;
  name: string;
  sha: string;
}

interface CommitParts {
  header: string;
  message: string;
}

interface CommitInfo {
  committedAt: string;
  message: string;
  parents: string[];
  tree: string;
}

const TREE_MODE = "40000";
const GITLINK_MODE = "160000";
const SYMLINK_MODE = "120000";
const SHA_BYTES = 20;
const SPACE_BYTE = 0x20;
const MINUTES_PER_HOUR = 60;
const MS_PER_SECOND = 1000;
const TREE_PREFIX = "tree ";
const PARENT_PREFIX = "parent ";
const COMMITTER_PREFIX = "committer ";

const gitHash = (type: string, body: Buffer): string =>
  createHash("sha1")
    .update(`${type} ${String(body.length)}\0`)
    .update(body)
    .digest("hex");

const blobShaOf = (body: Buffer): string => gitHash("blob", body);

const nameKey = (entry: TreeEntry): Buffer => {
  if (entry.mode === TREE_MODE) {
    return Buffer.from(`${entry.name}/`);
  }

  return Buffer.from(entry.name);
};

const sortTree = (entries: readonly TreeEntry[]): TreeEntry[] =>
  entries.toSorted((left, right) =>
    Buffer.compare(nameKey(left), nameKey(right))
  );

const comparePaths = (left: string, right: string): number =>
  Buffer.compare(Buffer.from(left), Buffer.from(right));

const parseTree = (body: Buffer): TreeEntry[] => {
  const entries: TreeEntry[] = [];
  let offset = 0;

  while (offset < body.length) {
    const space = body.indexOf(SPACE_BYTE, offset);
    const nul = body.indexOf(0, Math.max(space, offset));
    const shaStart = nul + 1;

    if (space === -1 || nul === -1 || shaStart + SHA_BYTES > body.length) {
      throw new Error("git tree object is malformed");
    }

    entries.push({
      mode: body.toString("utf-8", offset, space),
      name: body.toString("utf-8", space + 1, nul),
      sha: body.toString("hex", shaStart, shaStart + SHA_BYTES),
    });
    offset = shaStart + SHA_BYTES;
  }

  return entries;
};

const serializeTree = (entries: readonly TreeEntry[]): Buffer =>
  Buffer.concat(
    sortTree(entries).flatMap((entry) => [
      Buffer.from(`${entry.mode} ${entry.name}\0`),
      Buffer.from(entry.sha, "hex"),
    ])
  );

const identTime = (ident: string): string =>
  / (?<at>\d+) [+-]\d{4}$/u.exec(ident)?.groups?.at ?? "0";

const splitCommit = (text: string): CommitParts => {
  const split = text.indexOf("\n\n");

  if (split === -1) {
    return { header: text, message: "" };
  }

  return { header: text.slice(0, split), message: text.slice(split + 2) };
};

const parseCommit = (body: Buffer): CommitInfo => {
  const { header, message } = splitCommit(body.toString("utf-8"));
  const parents: string[] = [];
  let tree = "";
  let committedAt = "0";

  for (const line of header.split("\n")) {
    if (line.startsWith(TREE_PREFIX)) {
      tree = line.slice(TREE_PREFIX.length);
    }

    if (line.startsWith(PARENT_PREFIX)) {
      parents.push(line.slice(PARENT_PREFIX.length));
    }

    if (line.startsWith(COMMITTER_PREFIX)) {
      committedAt = identTime(line);
    }
  }

  return { committedAt, message, parents, tree };
};

const padTwo = (value: number): string => String(value).padStart(2, "0");

const timezone = (date: Date): string => {
  const offset = -date.getTimezoneOffset();
  const abs = Math.abs(offset);
  const hours = padTwo(Math.floor(abs / MINUTES_PER_HOUR));
  const minutes = padTwo(abs % MINUTES_PER_HOUR);

  if (offset < 0) {
    return `-${hours}${minutes}`;
  }

  return `+${hours}${minutes}`;
};

const gitIdent = (name: string, email: string, at = new Date()): string => {
  const seconds = Math.floor(at.getTime() / MS_PER_SECOND);

  return `${name} <${email}> ${String(seconds)} ${timezone(at)}`;
};

export {
  GITLINK_MODE,
  SYMLINK_MODE,
  TREE_MODE,
  blobShaOf,
  comparePaths,
  gitHash,
  gitIdent,
  identTime,
  parseCommit,
  parseTree,
  serializeTree,
  sortTree,
};

export type { CommitInfo, TreeEntry };
