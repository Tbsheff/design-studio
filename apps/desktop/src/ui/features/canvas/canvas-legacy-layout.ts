import {
  cleanFramePath,
  isFrameId,
} from "@design-studio/contracts/canvas-file";

import { isNumber, isText } from "../../platform/json-guard.js";
import { readStored, writeStored } from "../../platform/storage.js";
import { MAX_FRAMES, MAX_SIDE } from "./canvas-frame-ops.js";
import type { CanvasFrame, CanvasLayout } from "./canvas-layout-types.js";

type StoredValue =
  | string
  | number
  | boolean
  | null
  | StoredValue[]
  | { [key: string]: StoredValue };

type StoredRecord = Record<string, StoredValue>;

const MIN_SIDE = 200;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/u;

const MAX_COORD = 100_000;

const KEY = "design-studio.canvas.v1";

const ACTIVE_KEY = "design-studio.canvas.active.v1";

const MIGRATED_KEY = "design-studio.canvas.migrated.v1";

const isSide = (value: StoredValue | undefined): value is number =>
  isNumber(value) &&
  Number.isInteger(value) &&
  value >= MIN_SIDE &&
  value <= MAX_SIDE;

const isCoord = (value: StoredValue | undefined): value is number =>
  isNumber(value) && Number.isFinite(value) && Math.abs(value) <= MAX_COORD;

const toRecord = (value: StoredValue | undefined): StoredRecord | null => {
  if (value instanceof Object && !Array.isArray(value)) {
    return value;
  }

  return null;
};

const toLayoutFrame = (
  item: StoredValue,
  frames: readonly CanvasFrame[]
): CanvasFrame | null => {
  const record = toRecord(item);

  if (!record) {
    return null;
  }

  const { id, width, height, x, y } = record;

  if (!isFrameId(id) || frames.some((other) => other.id === id)) {
    return null;
  }

  if (!isSide(width) || !isSide(height) || !isCoord(x) || !isCoord(y)) {
    return null;
  }

  const frame: CanvasFrame = {
    height,
    id,
    width,
    x: Math.round(x),
    y: Math.round(y),
  };

  const { directionId, path } = record;

  if (isText(directionId) && ID_RE.test(directionId)) {
    frame.directionId = directionId;
  }

  let clean: string | null = null;

  if (isText(path)) {
    clean = cleanFramePath(path);
  }

  if (clean) {
    frame.path = clean;
  }

  return frame;
};

const parseLayout = (raw: StoredValue | undefined): CanvasLayout | null => {
  const record = toRecord(raw);

  if (!record) {
    return null;
  }

  const { frames: list, activeId: stored } = record;

  if (!Array.isArray(list) || !isText(stored)) {
    return null;
  }

  const frames: CanvasFrame[] = [];

  for (const item of list.slice(0, MAX_FRAMES)) {
    const frame = toLayoutFrame(item, frames);

    if (frame) {
      frames.push(frame);
    }
  }

  const [first] = frames;

  if (!first) {
    return null;
  }

  let activeId = first.id;

  if (frames.some((canvasFrame) => canvasFrame.id === stored)) {
    activeId = stored;
  }

  return { activeId, frames };
};

const readJson = (key: string): StoredRecord => {
  try {
    const parsed: StoredValue = JSON.parse(readStored(key) ?? "{}");

    return toRecord(parsed) ?? {};
  } catch {
    return {};
  }
};

const writeJson = (key: string, value: StoredRecord): boolean => {
  try {
    writeStored(key, JSON.stringify(value));

    return true;
  } catch {
    return false;
  }
};

const legacyLayout = (projectId: string): CanvasLayout | null => {
  if (readJson(MIGRATED_KEY)[projectId] === true) {
    return null;
  }

  return parseLayout(readJson(KEY)[projectId]);
};

const markMigrated = (projectId: string): void => {
  if (readJson(MIGRATED_KEY)[projectId] !== true) {
    writeJson(MIGRATED_KEY, { ...readJson(MIGRATED_KEY), [projectId]: true });
  }

  const legacy = readJson(KEY);

  if (!(projectId in legacy)) {
    return;
  }

  writeJson(
    KEY,
    Object.fromEntries(
      Object.entries(legacy).filter(([key]) => key !== projectId)
    )
  );
};

const storedActive = (projectId: string): string | null => {
  const value = readJson(ACTIVE_KEY)[projectId];

  if (isText(value)) {
    return value;
  }

  return null;
};

const saveActive = (projectId: string, activeId: string): void => {
  if (storedActive(projectId) === activeId) {
    return;
  }

  writeJson(ACTIVE_KEY, { ...readJson(ACTIVE_KEY), [projectId]: activeId });
};

export { legacyLayout, markMigrated, parseLayout, saveActive, storedActive };
