import { open, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const TAIL_BYTES = 65_536;

interface Sequenced {
  seq: number;
}

interface SeqFloor {
  lastSeq: number;
  reserved: number;
}

type FloorEntry = [string, SeqFloor];

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

const readEventFile = async <Entry extends Sequenced>(
  file: string
): Promise<Entry[]> => {
  try {
    return parseLines<Entry>(await readFile(file, "utf-8"));
  } catch {
    return [];
  }
};

const parseReserved = (text: string): number => {
  const value = Number(text.trim());

  if (Number.isSafeInteger(value) && value > 0) {
    return value;
  }

  return 0;
};

const readReserved = async (file: string): Promise<number> => {
  try {
    return parseReserved(await readFile(file, "utf-8"));
  } catch {
    return 0;
  }
};

const dropPartialLine = (text: string, start: number): string => {
  if (start === 0) {
    return text;
  }

  return text.slice(text.indexOf("\n") + 1);
};

const readTail = async (file: string): Promise<string> => {
  const handle = await open(file, "r");

  try {
    const { size } = await handle.stat();
    const start = Math.max(0, size - TAIL_BYTES);
    const buffer = Buffer.alloc(size - start);

    await handle.read(buffer, 0, buffer.length, start);

    return dropPartialLine(buffer.toString("utf-8"), start);
  } finally {
    await handle.close();
  }
};

const lastSeqOf = (events: Sequenced[]): number => events.at(-1)?.seq ?? 0;

const lastStoredSeq = async (file: string): Promise<number> => {
  let tail = "";

  try {
    tail = await readTail(file);
  } catch {
    return 0;
  }

  const tailSeq = lastSeqOf(parseLines(tail));

  if (tailSeq > 0) {
    return tailSeq;
  }

  return lastSeqOf(await readEventFile(file));
};

const readFloor = async (dir: string): Promise<SeqFloor> => {
  const [reserved, stored] = await Promise.all([
    readReserved(path.join(dir, "events.seq")),
    lastStoredSeq(path.join(dir, "events.jsonl")),
  ]);

  return { lastSeq: Math.max(reserved, stored), reserved };
};

const listDir = async (dir: string): Promise<string[]> => {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
};

const trashedProjectId = async (dir: string): Promise<string | null> => {
  try {
    const text = await readFile(path.join(dir, "trashed.json"), "utf-8");
    const record = JSON.parse(text) as { projectId?: string };

    return record.projectId ?? null;
  } catch {
    return null;
  }
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
    Promise.all(projectIds.map((id) => projectFloor(projectsRoot, id))),
    Promise.all(trashIds.map((id) => trashFloor(path.join(trashRoot, id)))),
  ]);

  return mergeTrash(new Map(projectFloors), trashFloors);
};

export { readEventFile, readSeqFloors };

export type { SeqFloor };
