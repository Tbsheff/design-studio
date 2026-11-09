import type { StudioEvent } from "@design-studio/contracts";
import {
  cleanFramePath,
  normalizeCanvasFile,
  serializeCanvasFile,
} from "@design-studio/contracts/canvas-file";
import type {
  CanvasFile,
  CanvasSection,
} from "@design-studio/contracts/canvas-file";
import { useEffect, useSyncExternalStore } from "react";

import { ApiError, api } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import type { Viewport } from "../../platform/storage.js";
import { defaultLayout, firstShown, withoutKey } from "./canvas-frame-ops.js";
import type {
  Box,
  CanvasFrame,
  CanvasLayout,
  FramePreset,
} from "./canvas-layout-types.js";
import {
  legacyLayout,
  markMigrated,
  parseLayout,
  saveActive,
  storedActive,
} from "./canvas-legacy-layout.js";

const TO_STRING_36 = 36;

const SLICE_12 = 12;

const STATUS_409 = 409;

const WRITE_DELAY_MS = 400;

const RETRY_MS = 2000;

let writerSlot: string | null = null;

const toWriterId = (): string => {
  if (writerSlot === null) {
    writerSlot = `w${Math.random().toString(TO_STRING_36).slice(2, SLICE_12)}`;
  }

  return writerSlot;
};

const toCanvasFile = (
  layout: CanvasLayout | null,
  lofi: readonly string[],
  sections: readonly CanvasSection[]
): CanvasFile => {
  const frames = [];

  for (const [order, frame] of (layout?.frames ?? []).entries()) {
    frames.push({ ...frame, order });
  }

  return normalizeCanvasFile({
    frames,
    lofi: [...lofi],
    sections: [...sections],
    version: 1,
  });
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
  sections: CanvasSection[];
  isPending: boolean;
  hash: string | null;
  loaded: boolean;
  loading: Promise<void> | null;
  requestedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
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
      isPending: false,
      lofi: [],
      requestedAt: 0,
      sections: [],
      timer: null,
      writing: false,
    };
    entries.set(projectId, entry);
  }

  return entry;
};

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const fileText = (entry: Pick<Entry, "layout" | "lofi" | "sections">): string =>
  serializeCanvasFile(toCanvasFile(entry.layout, entry.lofi, entry.sections));

const applySnapshot = (
  projectId: string,
  canvas: CanvasFile | null,
  hash: string | null
): void => {
  const entry = entryOf(projectId);

  if (entry.timer !== null) {
    globalThis.clearTimeout(entry.timer);
  }

  entry.timer = null;
  entry.again = false;
  entry.hash = hash;
  entry.lofi = canvas?.lofi ?? [];
  entry.sections = canvas?.sections ?? [];
  entry.isPending = false;
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
): Promise<boolean> => {
  const entry = entryOf(projectId);
  entry.layout = legacy;
  notify();

  try {
    const result = await api.putCanvas(projectId, {
      baseHash: entry.hash,
      canvas: toCanvasFile(legacy, entry.lofi, entry.sections),
      migrate: true,
      writer: toWriterId(),
    });

    entry.hash = result.hash;
    markMigrated(projectId);
  } catch (error) {
    if (error instanceof ApiError && error.status === STATUS_409) {
      return true;
    }

    reportError(error);
  }

  return false;
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

  if (!legacy) {
    markMigrated(projectId);

    return;
  }

  if (await migrate(projectId, legacy)) {
    await reloadCanvas(projectId);
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
      canvas: toCanvasFile(entry.layout, entry.lofi, entry.sections),
      writer: toWriterId(),
    });

    entry.hash = result.hash;
  } catch (error) {
    stale = error instanceof ApiError && error.status === STATUS_409;

    if (!stale) {
      reportError(error);
    }

    if (!stale && fileText(entry) === sent) {
      entry.timer = globalThis.setTimeout(() => flush(projectId), RETRY_MS);
    }
  } finally {
    entry.writing = false;
  }

  if (stale) {
    try {
      await reloadCanvas(projectId);
    } catch (error) {
      reportError(error);
    }

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
    globalThis.clearTimeout(entry.timer);
  }

  entry.timer = globalThis.setTimeout(() => flush(projectId), WRITE_DELAY_MS);
};

const loadCanvas = async (projectId: string, entry: Entry): Promise<void> => {
  try {
    await reloadCanvas(projectId);
  } catch (error) {
    reportError(error);
  } finally {
    entry.loading = null;
  }
};

const ensureLoaded = (projectId: string): void => {
  const entry = entryOf(projectId);

  if (entry.loaded || entry.loading) {
    return;
  }

  entry.loading = loadCanvas(projectId, entry);
};

const receiveCanvasEvent = (event: StudioEvent): void => {
  if (event.type !== "canvas.changed") {
    return;
  }

  const entry = entryOf(event.projectId);

  if (!entry.loaded || event.ts < entry.requestedAt) {
    return;
  }

  if (event.writer === toWriterId() || event.hash === entry.hash) {
    return;
  }

  applySnapshot(event.projectId, event.canvas, event.hash);
};

const NO_LOFI: string[] = [];

const NO_SECTIONS: CanvasSection[] = [];

interface SectionChange {
  readonly layout: CanvasLayout | null;
  readonly sections: CanvasSection[];
}

const canvasStore = {
  get: (projectId: string): CanvasLayout | null =>
    entries.get(projectId)?.layout ?? null,
  load: ensureLoaded,
  loaded: (projectId: string): boolean =>
    entries.get(projectId)?.loaded ?? false,
  lofi: (projectId: string): string[] =>
    entries.get(projectId)?.lofi ?? NO_LOFI,
  set: (projectId: string, layout: CanvasLayout): void => {
    const entry = entryOf(projectId);
    const before = fileText(entry);
    entry.layout = layout;
    saveActive(projectId, layout.activeId);
    notify();

    if (entry.loaded && fileText(entry) !== before) {
      schedule(projectId);
    }
  },
  sections: (projectId: string): CanvasSection[] =>
    entries.get(projectId)?.sections ?? NO_SECTIONS,
  setSections: (
    projectId: string,
    change: SectionChange,
    isFinal: boolean
  ): void => {
    const entry = entryOf(projectId);
    const before = fileText(entry);
    entry.sections = change.sections;

    if (change.layout) {
      entry.layout = change.layout;
    }

    notify();

    if (fileText(entry) !== before) {
      entry.isPending = true;
    }

    if (isFinal && entry.loaded && entry.isPending) {
      entry.isPending = false;
      schedule(projectId);
    }
  },
  setLofi: (
    projectId: string,
    directionId: string,
    on: boolean,
    fallback: CanvasLayout
  ): void => {
    const entry = entryOf(projectId);

    if (!entry.loaded || entry.lofi.includes(directionId) === on) {
      return;
    }

    entry.lofi = ((): string[] => {
      if (on) {
        return [...entry.lofi, directionId].toSorted();
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

const useCanvasSectionList = (projectId: string): CanvasSection[] =>
  useSyncExternalStore(canvasStore.subscribe, () =>
    canvasStore.sections(projectId)
  );

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
  useCanvasSectionList,
};

export type { Box, CanvasFrame, CanvasLayout, FramePreset, SectionChange };
