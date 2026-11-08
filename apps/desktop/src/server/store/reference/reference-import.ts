import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestError, isNodeError } from "../../platform/errors/index.js";
import { MAX_TOTAL_BYTES } from "./engine/reference-limits.js";
import { isWithinKindLimit } from "./engine/to-entry-kind.js";
import { toImportPlan } from "./engine/to-import-plan.js";
import { toIndexText, toSummaryLine } from "./engine/to-index-text.js";
import type { IndexEntry } from "./engine/to-index-text.js";
import { toReferenceName } from "./engine/to-reference-name.js";
import { getDataSource, getPathSource } from "./reference-source.js";
import type { LoadedSource } from "./reference-source.js";

interface ImportCommand {
  readonly data: string | null;
  readonly fileName: string | null;
  readonly name: string | null;
  readonly path: string | null;
  readonly workTree: string;
}

interface ReferenceSummary {
  readonly bytes: number;
  readonly documentCount: number;
  readonly fileCount: number;
  readonly imageCount: number;
  readonly indexPath: string;
  readonly name: string;
  readonly path: string;
  readonly skippedCount: number;
  readonly source: "file" | "folder" | "zip";
  readonly textCount: number;
}

interface Tally {
  readonly bytes: number;
  readonly entries: readonly IndexEntry[];
  readonly skippedCount: number;
}

const REFERENCE_DIR = "reference";

const READ_ONLY_MODE = 0o444;

const MAX_NAME_ATTEMPTS = 99;

const FIRST_ATTEMPT = 1;

const IGNORE_ALL = "*\n";

const getSource = (command: ImportCommand): Promise<LoadedSource> => {
  if (command.path !== null && command.data === null) {
    return getPathSource(command.path);
  }

  if (command.data !== null && command.path === null) {
    return getDataSource(command.fileName ?? REFERENCE_DIR, command.data);
  }

  throw new BadRequestError("Give either path or data, not both.");
};

const toAttemptName = (name: string, attempt: number): string => {
  if (attempt === FIRST_ATTEMPT) {
    return name;
  }

  return `${name}-${attempt}`;
};

const createDirectoryNamed = async (
  root: string,
  name: string
): Promise<boolean> => {
  try {
    await mkdir(path.join(root, name));

    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      return false;
    }

    throw error;
  }
};

const createUniqueDirectory = async (
  root: string,
  name: string,
  attempt: number
): Promise<string> => {
  if (attempt > MAX_NAME_ATTEMPTS) {
    throw new BadRequestError("Too many references share this name.");
  }

  const candidate = toAttemptName(name, attempt);

  if (await createDirectoryNamed(root, candidate)) {
    return candidate;
  }

  return createUniqueDirectory(root, name, attempt + 1);
};

const toSummaryOf = (
  kind: IndexEntry["kind"],
  buffer: Buffer
): string | null => {
  if (kind !== "text") {
    return null;
  }

  return toSummaryLine(buffer.toString("utf-8"));
};

const createEntry = async (
  directory: string,
  relativePath: string,
  buffer: Buffer
): Promise<void> => {
  const target = path.join(directory, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  await chmod(target, READ_ONLY_MODE);
};

const BATCH_SIZE = 32;

const runInBatches = async <Item, Result>(
  items: readonly Item[],
  run: (item: Item) => Promise<Result>
): Promise<Result[]> => {
  const head = items.slice(0, BATCH_SIZE);

  if (head.length === 0) {
    return [];
  }

  const done = await Promise.all(head.map((item) => run(item)));

  return [...done, ...(await runInBatches(items.slice(BATCH_SIZE), run))];
};

const createEntries = async (
  directory: string,
  loaded: LoadedSource
): Promise<Tally> => {
  const plan = toImportPlan(loaded.entries);

  const written = await runInBatches(
    plan.kept,
    async (item): Promise<IndexEntry | null> => {
      const entry = loaded.entries[item.index];

      if (!entry) {
        return null;
      }

      const buffer = await entry.read();

      if (!isWithinKindLimit(item.kind, buffer.length)) {
        return null;
      }

      await createEntry(directory, entry.relativePath, buffer);

      return {
        bytes: buffer.length,
        kind: item.kind,
        path: entry.relativePath,
        summary: toSummaryOf(item.kind, buffer),
      };
    }
  );

  const entries = written.filter((entry) => entry !== null);
  const bytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);

  return {
    bytes,
    entries,
    skippedCount: loaded.entries.length - entries.length,
  };
};

const toKindCount = (
  entries: readonly IndexEntry[],
  kind: IndexEntry["kind"]
): number => entries.filter((entry) => entry.kind === kind).length;

const inspectTally = async (directory: string, tally: Tally): Promise<void> => {
  if (tally.entries.length === 0) {
    await rm(directory, { force: true, recursive: true });

    throw new BadRequestError(
      "Nothing in this source can be used as reference. Add text, images or PDFs."
    );
  }

  if (tally.bytes > MAX_TOTAL_BYTES) {
    await rm(directory, { force: true, recursive: true });

    throw new BadRequestError("The source is over 50 MB. Use a smaller one.");
  }
};

const importReferenceInto = async (
  command: ImportCommand
): Promise<ReferenceSummary> => {
  const loaded = await getSource(command);
  const root = path.join(command.workTree, REFERENCE_DIR);
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, ".gitignore"), IGNORE_ALL);

  const folderName = await createUniqueDirectory(
    root,
    toReferenceName(command.name, loaded.stem),
    FIRST_ATTEMPT
  );

  const directory = path.join(root, folderName);
  const tally = await createEntries(directory, loaded);
  await inspectTally(directory, tally);
  const indexFile = path.posix.join(REFERENCE_DIR, folderName, "INDEX.md");

  await writeFile(
    path.join(command.workTree, indexFile),
    toIndexText({ ...tally, name: folderName, source: loaded.source })
  );

  return {
    bytes: tally.bytes,
    documentCount: toKindCount(tally.entries, "document"),
    fileCount: tally.entries.length,
    imageCount: toKindCount(tally.entries, "image"),
    indexPath: indexFile,
    name: folderName,
    path: path.posix.join(REFERENCE_DIR, folderName),
    skippedCount: tally.skippedCount,
    source: loaded.source,
    textCount: toKindCount(tally.entries, "text"),
  };
};

export { importReferenceInto };

export type { ImportCommand, ReferenceSummary };
