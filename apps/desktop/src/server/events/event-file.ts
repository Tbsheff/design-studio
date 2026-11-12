import {
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { logError } from "../platform/logger/index.js";

const TAIL_BYTES = 65_536;
const SEQ_TAIL_BYTES = 16_777_216;
const HYDRATE_LIMIT = 8;
const EVENT_FILE_MAX_BYTES = 8_388_608;
const EVENT_FILE_KEEP_BYTES = 4_194_304;
const COMPACT_SUFFIX = ".compact.tmp";
const MISSING_CODES = new Set(["ENOENT", "ENOTDIR"]);

interface Sequenced {
  seq: number;
}

interface SizedEntry<Entry> {
  readonly bytes: number;
  readonly entry: Entry;
}

interface SeqFloor {
  lastSeq: number;
  reserved: number;
}

type FloorEntry = [string, SeqFloor];

const orMissing = async <Value>(
  read: () => Promise<Value>,
  fallback: Value
): Promise<Value> => {
  try {
    return await read();
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      MISSING_CODES.has(String(error.code))
    ) {
      return fallback;
    }

    throw error;
  }
};

const mapLimited = async <Item, Result>(
  items: Item[],
  limit: number,
  run: (item: Item) => Promise<Result>
): Promise<Result[]> => {
  const results: Result[] = Array.from({ length: items.length });
  let next = 0;

  const worker = async (): Promise<void> => {
    if (next >= items.length) {
      return;
    }

    const index = next;

    next += 1;
    results[index] = await run(items[index] as Item);
    await worker();
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);

  await Promise.all(workers);

  return results;
};

const parseLine = <Entry extends Sequenced>(line: string): Entry | null => {
  try {
    return JSON.parse(line) as Entry;
  } catch {
    return null;
  }
};

const parseFilled = <Entry extends Sequenced>(line: string): Entry | null => {
  if (line.trim() === "") {
    return null;
  }

  return parseLine<Entry>(line);
};

const parseLines = <Entry extends Sequenced>(text: string): Entry[] => {
  const events: Entry[] = [];
  let lastSeq = 0;

  for (const line of text.split("\n")) {
    const event = parseFilled<Entry>(line);

    if (event !== null && event.seq > lastSeq) {
      lastSeq = event.seq;
      events.push(event);
    }
  }

  return events;
};

const parseReserved = (text: string): number => {
  const value = Number(text.trim());

  if (Number.isSafeInteger(value) && value > 0) {
    return value;
  }

  return 0;
};

const readReserved = async (file: string): Promise<number> =>
  parseReserved(await orMissing(() => readFile(file, "utf-8"), ""));

const dropPartialLine = (text: string, start: number): string => {
  if (start === 0) {
    return text;
  }

  return text.slice(text.indexOf("\n") + 1);
};

const getTailText = async (file: string, maxBytes: number): Promise<string> => {
  const handle = await open(file, "r");

  try {
    const { size } = await handle.stat();
    const start = Math.max(0, size - maxBytes);
    const buffer = Buffer.alloc(size - start);

    await handle.read(buffer, 0, buffer.length, start);

    return dropPartialLine(buffer.toString("utf-8"), start);
  } finally {
    await handle.close();
  }
};

const toSizedLines = <Entry extends Sequenced>(
  text: string
): SizedEntry<Entry>[] => {
  const entries: SizedEntry<Entry>[] = [];
  let lastSeq = 0;

  for (const line of text.split("\n")) {
    const entry = parseFilled<Entry>(line);

    if (entry !== null && entry.seq > lastSeq) {
      lastSeq = entry.seq;
      entries.push({ bytes: line.length, entry });
    }
  }

  return entries;
};

const getEventTail = async <Entry extends Sequenced>(
  file: string,
  maxBytes: number
): Promise<SizedEntry<Entry>[]> => {
  try {
    return toSizedLines<Entry>(await getTailText(file, maxBytes));
  } catch {
    return [];
  }
};

const toWholeLines = (buffer: Buffer, start: number): Buffer => {
  if (start === 0) {
    return buffer;
  }

  const newline = buffer.indexOf("\n");

  if (newline === -1) {
    return Buffer.alloc(0);
  }

  return buffer.subarray(newline + 1);
};

const getTailBuffer = async (file: string, size: number): Promise<Buffer> => {
  const handle = await open(file, "r");

  try {
    const start = Math.max(0, size - EVENT_FILE_KEEP_BYTES);
    const buffer = Buffer.alloc(size - start);

    await handle.read(buffer, 0, buffer.length, start);

    return toWholeLines(buffer, start);
  } finally {
    await handle.close();
  }
};

const applyFileTail = async (file: string, size: number): Promise<number> => {
  const tail = await getTailBuffer(file, size);
  const temp = `${file}${COMPACT_SUFFIX}`;

  try {
    await writeFile(temp, tail);
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }

  return tail.length;
};

const toFileSize = async (file: string): Promise<number> => {
  const handle = await open(file, "r");

  try {
    const stats = await handle.stat();

    return stats.size;
  } finally {
    await handle.close();
  }
};

const applyEventFileCap = async (file: string): Promise<number> => {
  const size = await toFileSize(file);

  if (size <= EVENT_FILE_MAX_BYTES) {
    return size;
  }

  return await applyFileTail(file, size);
};

const applyBootCap = async (file: string): Promise<void> => {
  try {
    await orMissing(() => applyEventFileCap(file), 0);
  } catch (error) {
    logError("[events] cap failed", error);
  }
};

const lastSeqOf = (events: Sequenced[]): number => events.at(-1)?.seq ?? 0;

const lastStoredSeq = async (file: string): Promise<number> => {
  const tail = await orMissing(() => getTailText(file, TAIL_BYTES), "");
  const tailSeq = lastSeqOf(parseLines(tail));

  if (tailSeq > 0) {
    return tailSeq;
  }

  const wide = await orMissing(() => getTailText(file, SEQ_TAIL_BYTES), "");

  return lastSeqOf(parseLines(wide));
};

const readFloor = async (dir: string): Promise<SeqFloor> => {
  const file = path.join(dir, "events.jsonl");

  await applyBootCap(file);

  const [reserved, stored] = await Promise.all([
    readReserved(path.join(dir, "events.seq")),
    lastStoredSeq(file),
  ]);

  return { lastSeq: Math.max(reserved, stored), reserved };
};

const listDir = (dir: string): Promise<string[]> =>
  orMissing(() => readdir(dir), []);

const parseProjectId = (text: string): string | null => {
  try {
    const record = JSON.parse(text) as { projectId?: string };

    return record.projectId ?? null;
  } catch {
    return null;
  }
};

const trashedProjectId = async (dir: string): Promise<string | null> => {
  const file = path.join(dir, "trashed.json");
  const text = await orMissing(() => readFile(file, "utf-8"), null);

  if (text === null) {
    return null;
  }

  return parseProjectId(text);
};

const trashFloor = async (dir: string): Promise<FloorEntry | null> => {
  const projectId = await trashedProjectId(dir);

  if (projectId === null) {
    return null;
  }

  return [projectId, await readFloor(dir)];
};

const projectFloor = async (
  root: string,
  projectId: string
): Promise<FloorEntry> => [
  projectId,
  await readFloor(path.join(root, projectId)),
];

const mergeTrash = (
  floors: Map<string, SeqFloor>,
  entries: (FloorEntry | null)[]
): Map<string, SeqFloor> => {
  for (const entry of entries) {
    if (entry !== null) {
      const [projectId, floor] = entry;
      const known = floors.get(projectId);
      const lastSeq = Math.max(known?.lastSeq ?? 0, floor.lastSeq);

      floors.set(projectId, { lastSeq, reserved: known?.reserved ?? 0 });
    }
  }

  return floors;
};

const readSeqFloors = async (
  dataDir: string
): Promise<Map<string, SeqFloor>> => {
  const projectsRoot = path.join(dataDir, "projects");
  const trashRoot = path.join(dataDir, "trash", "projects");

  const [projectIds, trashIds] = await Promise.all([
    listDir(projectsRoot),
    listDir(trashRoot),
  ]);

  const [projectFloors, trashFloors] = await Promise.all([
    mapLimited(projectIds, HYDRATE_LIMIT, (id) =>
      projectFloor(projectsRoot, id)
    ),
    mapLimited(trashIds, HYDRATE_LIMIT, (id) =>
      trashFloor(path.join(trashRoot, id))
    ),
  ]);

  return mergeTrash(new Map(projectFloors), trashFloors);
};

export { applyEventFileCap, EVENT_FILE_MAX_BYTES, getEventTail, readSeqFloors };

export type { SeqFloor, SizedEntry };
