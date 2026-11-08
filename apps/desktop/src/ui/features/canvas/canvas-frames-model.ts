import type { StudioEvent } from "@design-studio/contracts";
import {
  cleanFramePath,
  isFrameId,
  normalizeCanvasFile,
  serializeCanvasFile,
} from "@design-studio/contracts/canvas-file";
import type { CanvasFile } from "@design-studio/contracts/canvas-file";
import { useEffect, useSyncExternalStore } from "react";

import { ApiError, api } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import { readStored, writeStored } from "../../platform/storage.js";
import type { Viewport } from "../../platform/storage.js";
import {
  MAX_FRAMES,
  MAX_SIDE,
  defaultLayout,
  firstShown,
  withoutKey,
} from "./canvas-frame-ops.js";

const TO_STRING_36 = 36;

const SLICE_12 = 12;

const STATUS_409 = 409;

interface CanvasFrame {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  directionId?: string;
  path?: string;
  label?: string;
  hidden?: boolean;
}

interface CanvasLayout {
  frames: CanvasFrame[];
  activeId: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FramePreset {
  preset: Exclude<Viewport["preset"], "custom">;
  label: string;
  width: number;
  height: number;
}

const MIN_SIDE = 200;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const MAX_COORD = 100_000;

const KEY = "design-studio.canvas.v1";

const ACTIVE_KEY = "design-studio.canvas.active.v1";

const MIGRATED_KEY = "design-studio.canvas.migrated.v1";

const WRITE_DELAY_MS = 400;

const RETRY_MS = 2000;

const writerId = `w${Math.random().toString(TO_STRING_36).slice(2, SLICE_12)}`;

const isSide = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= MIN_SIDE &&
  value <= MAX_SIDE;

const isCoord = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Math.abs(value) <= MAX_COORD;

const parseLayout = (raw: unknown): CanvasLayout | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (!Array.isArray(record.frames) || typeof record.activeId !== "string") {
    return null;
  }

  const frames: CanvasFrame[] = [];

  for (const item of record.frames.slice(0, MAX_FRAMES)) {
    const frame2 = item as Record<string, unknown>;

    if (
      !isFrameId(frame2.id) ||
      frames.some((other) => other.id === frame2.id)
    ) {
      continue;
    }

    if (
      !isSide(frame2.width) ||
      !isSide(frame2.height) ||
      !isCoord(frame2.x) ||
      !isCoord(frame2.y)
    ) {
      continue;
    }

    const frame: CanvasFrame = {
      height: frame2.height,
      id: frame2.id,
      width: frame2.width,
      x: Math.round(frame2.x),
      y: Math.round(frame2.y),
    };

    if (
      typeof frame2.directionId === "string" &&
      ID_RE.test(frame2.directionId)
    ) {
      frame.directionId = frame2.directionId;
    }

    let path: string | null = null;

    if (typeof frame2.path === "string") {
      path = cleanFramePath(frame2.path);
    }

    if (path) {
      frame.path = path;
    }

    frames.push(frame);
  }

  if (frames.length === 0) {
    return null;
  }

  let activeId: string = (frames[0] as CanvasFrame).id;

  if (frames.some((canvasFrame32) => canvasFrame32.id === record.activeId)) {
    activeId = record.activeId;
  }

  return { activeId, frames };
};

const readJson = (key: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(readStored(key) ?? "{}") as unknown;

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const writeJson = (key: string, value: Record<string, unknown>): boolean => {
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

  delete legacy[projectId];
  writeJson(KEY, legacy);
};

const storedActive = (projectId: string): string | null => {
  const value = readJson(ACTIVE_KEY)[projectId];

  if (typeof value === "string") {
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

const toCanvasFile = (
  layout: CanvasLayout | null,
  lofi: readonly string[]
): CanvasFile => {
  const frames = (layout?.frames ?? []).map((frame, order) => ({
    ...frame,
    order,
  }));

  return normalizeCanvasFile({ frames, lofi: [...lofi], version: 1 });
};

const fromCanvasFile = (
  file: CanvasFile,
  activeId: string | null
): CanvasLayout | null => {
  const frames: CanvasFrame[] = file.frames.map(
    ({ order: _order, ...frame }) => frame
  );

  if (frames.length === 0) {
    return null;
  }

  const pick =
    frames.find(
      (canvasFrame33) => canvasFrame33.id === activeId && !canvasFrame33.hidden
    ) ?? firstShown(frames);

  return {
    activeId: pick.id,
    frames: frames.map((canvasFrame34) => {
      if (canvasFrame34.id === pick.id && canvasFrame34.hidden) {
        return withoutKey(canvasFrame34, "hidden");
      }

      return canvasFrame34;
    }),
  };
};

interface Entry {
  layout: CanvasLayout | null;
  lofi: string[];
  hash: string | null;
  loaded: boolean;
  loading: Promise<void> | null;
  requestedAt: number;
  timer: number | null;
  writing: boolean;
  again: boolean;
}

const entries = new Map<string, Entry>();

const listeners = new Set<() => void>();

const entryOf = (projectId: string): Entry => {
  let entry = entries.get(projectId);

  if (!entry) {
    entry = {
      again: false,
      hash: null,
      layout: null,
      loaded: false,
      loading: null,
      lofi: [],
      requestedAt: 0,
      timer: null,
      writing: false,
    };
    entries.set(projectId, entry);
  }

  return entry;
};

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

const fileText = (entry: Pick<Entry, "layout" | "lofi">): string =>
  serializeCanvasFile(toCanvasFile(entry.layout, entry.lofi));

const applySnapshot = (
  projectId: string,
  canvas: CanvasFile | null,
  hash: string | null
): void => {
  const entry = entryOf(projectId);

  if (entry.timer !== null) {
    window.clearTimeout(entry.timer);
  }

  entry.timer = null;
  entry.again = false;
  entry.hash = hash;
  entry.lofi = canvas?.lofi ?? [];
  const active = entry.layout?.activeId ?? storedActive(projectId);
  entry.layout = null;

  if (canvas) {
    entry.layout = fromCanvasFile(canvas, active);
  }

  notify();
};

const migrate = async (
  projectId: string,
  legacy: CanvasLayout
): Promise<void> => {
  const entry = entryOf(projectId);
  entry.layout = legacy;
  notify();

  try {
    const result = await api.putCanvas(projectId, {
      baseHash: entry.hash,
      canvas: toCanvasFile(legacy, entry.lofi),
      migrate: true,
      writer: writerId,
    });

    entry.hash = result.hash;
    markMigrated(projectId);
  } catch (error) {
    if (error instanceof ApiError && error.status === STATUS_409) {
      await reloadCanvas(projectId);
    } else {
      console.error("[canvas] migration failed", error);
    }
  }
};

const reloadCanvas = async (projectId: string): Promise<void> => {
  const entry = entryOf(projectId);
  entry.requestedAt = Date.now();
  const snapshot = await api.getCanvas(projectId);
  applySnapshot(projectId, snapshot.canvas, snapshot.hash);
  entry.loaded = true;
  const hasFrames = (snapshot.canvas?.frames.length ?? 0) > 0;

  let legacy: CanvasLayout | null = null;

  if (!hasFrames) {
    legacy = legacyLayout(projectId);
  }

  if (legacy) {
    await migrate(projectId, legacy);
  } else {
    markMigrated(projectId);
  }
};

const flush = async (projectId: string): Promise<void> => {
  const entry = entryOf(projectId);
  entry.timer = null;

  if (entry.writing) {
    entry.again = true;

    return;
  }

  entry.writing = true;
  const sent = fileText(entry);
  let stale = false;

  try {
    const result = await api.putCanvas(projectId, {
      baseHash: entry.hash,
      canvas: toCanvasFile(entry.layout, entry.lofi),
      writer: writerId,
    });

    entry.hash = result.hash;
  } catch (error) {
    stale = error instanceof ApiError && error.status === STATUS_409;

    if (!stale) {
      console.error("[canvas] save failed", error);
    }

    if (!stale && fileText(entry) === sent) {
      entry.timer = window.setTimeout(() => void flush(projectId), RETRY_MS);
    }
  } finally {
    entry.writing = false;
  }

  if (stale) {
    await reloadCanvas(projectId).catch((error: unknown) =>
      console.error("[canvas] reload failed", error)
    );

    return;
  }

  if (entry.again) {
    entry.again = false;
    void flush(projectId);
  }
};

const schedule = (projectId: string): void => {
  const entry = entryOf(projectId);

  if (entry.timer !== null) {
    window.clearTimeout(entry.timer);
  }

  entry.timer = window.setTimeout(() => void flush(projectId), WRITE_DELAY_MS);
};

const ensureLoaded = (projectId: string): void => {
  const entry = entryOf(projectId);

  if (entry.loaded || entry.loading) {
    return;
  }

  entry.loading = reloadCanvas(projectId)
    .catch((error: unknown) => console.error("[canvas] load failed", error))
    .finally(() => {
      entry.loading = null;
    });
};

const receiveCanvasEvent = (event: StudioEvent): void => {
  if (event.type !== "canvas.changed") {
    return;
  }

  const entry = entryOf(event.projectId);

  if (!entry.loaded || event.ts < entry.requestedAt) {
    return;
  }

  if (event.writer === writerId || event.hash === entry.hash) {
    return;
  }

  applySnapshot(event.projectId, event.canvas, event.hash);
};

const NO_LOFI: string[] = [];

const canvasStore = {
  get: (projectId: string): CanvasLayout | undefined =>
    entries.get(projectId)?.layout ?? undefined,
  load: ensureLoaded,
  loaded: (projectId: string): boolean =>
    entries.get(projectId)?.loaded ?? false,
  lofi: (projectId: string): string[] =>
    entries.get(projectId)?.lofi ?? NO_LOFI,
  set: (projectId: string, layout: CanvasLayout) => {
    const entry = entryOf(projectId);
    const before = fileText(entry);
    entry.layout = layout;
    saveActive(projectId, layout.activeId);
    notify();

    if (entry.loaded && fileText(entry) !== before) {
      schedule(projectId);
    }
  },
  setLofi: (
    projectId: string,
    directionId: string,
    on: boolean,
    fallback: CanvasLayout
  ) => {
    const entry = entryOf(projectId);

    if (!entry.loaded || entry.lofi.includes(directionId) === on) {
      return;
    }

    entry.lofi = ((): string[] => {
      if (on) {
        return [...entry.lofi, directionId].sort();
      }

      return entry.lofi.filter((id) => id !== directionId);
    })();
    entry.layout ??= fallback;
    notify();
    schedule(projectId);
  },
  subscribe: (listener2: () => void) => {
    listeners.add(listener2);

    return (): void => {
      listeners.delete(listener2);
    };
  },
};

const useCanvasLayout = (
  projectId: string,
  viewport: Viewport
): [CanvasLayout, (update: (layout: CanvasLayout) => CanvasLayout) => void] => {
  useEffect(() => canvasStore.load(projectId), [projectId]);
  useProjectEvents(projectId, receiveCanvasEvent);

  const stored = useSyncExternalStore(canvasStore.subscribe, () =>
    canvasStore.get(projectId)
  );

  const layout = stored ?? defaultLayout(viewport);

  const update = (fn: (layout: CanvasLayout) => CanvasLayout): void => {
    const current = canvasStore.get(projectId) ?? defaultLayout(viewport);
    const next = fn(current);

    if (next !== current) {
      canvasStore.set(projectId, next);
    }
  };

  return [layout, update];
};

const useCanvasLofi = (projectId: string): string[] =>
  useSyncExternalStore(canvasStore.subscribe, () =>
    canvasStore.lofi(projectId)
  );

export {
  canvasStore,
  cleanFramePath,
  fromCanvasFile,
  parseLayout,
  receiveCanvasEvent,
  reloadCanvas,
  toCanvasFile,
  useCanvasLayout,
  useCanvasLofi,
};

export type { Box, CanvasFrame, CanvasLayout, FramePreset };
