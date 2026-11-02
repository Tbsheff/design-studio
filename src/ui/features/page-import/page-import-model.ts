import { canvasStore } from "./deps.js";
import type { CanvasFrame } from "./deps.js";

type ImportStep = "assets" | "loading" | "styles";

interface ViewportPreset {
  readonly id: string;
  readonly label: string;
  readonly width: number;
}

const VIEWPORT_PRESETS: readonly ViewportPreset[] = [
  { id: "desktop", label: "Desktop 1440", width: 1440 },
  { id: "tablet", label: "Tablet 1024", width: 1024 },
  { id: "mobile", label: "Mobile 390", width: 390 },
];

const STEP_TIMES: readonly {
  readonly at: number;
  readonly step: ImportStep;
}[] = [
  { at: 6000, step: "styles" },
  { at: 14_000, step: "assets" },
];

const FRAME_WAIT_MS = 10_000;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const isImportUrl = (text: string): boolean => {
  if (!URL.canParse(text)) {
    return false;
  }

  const parsed = new URL(text);

  if (parsed.protocol === "https:") {
    return true;
  }

  return parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname);
};

const findFrame = (projectId: string, frameId: string): CanvasFrame | null =>
  canvasStore.get(projectId)?.frames.find((frame) => frame.id === frameId) ??
  null;

const waitForFrame = async (
  projectId: string,
  frameId: string
): Promise<CanvasFrame | null> => {
  const now = findFrame(projectId, frameId);

  if (now) {
    return now;
  }

  const { promise, resolve } = Promise.withResolvers<CanvasFrame | null>();

  const unsubscribe = canvasStore.subscribe(() => {
    const found = findFrame(projectId, frameId);

    if (found) {
      resolve(found);
    }
  });

  const timer = globalThis.setTimeout(() => resolve(null), FRAME_WAIT_MS);
  const frame = await promise;

  globalThis.clearTimeout(timer);
  unsubscribe();

  return frame;
};

export { STEP_TIMES, VIEWPORT_PRESETS, isImportUrl, waitForFrame };

export type { ImportStep, ViewportPreset };
