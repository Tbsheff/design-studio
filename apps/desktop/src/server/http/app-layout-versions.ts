import type { CanvasWriteSource } from "@design-studio/contracts";

import { layoutLabel } from "../canvas/index.js";
import { createLayoutVersionQueue } from "../store/index.js";
import type { AppContext } from "./app-context.js";

const LAYOUT_VERSION_DELAY_MS = 10_000;

const LAYOUT_VERSION_SOURCES = new Set<CanvasWriteSource>([
  "user",
  "agent",
  "restore",
]);

interface LayoutVersions {
  readonly flushLayoutVersions: () => Promise<void>;
}

const startLayoutVersions = (ctx: AppContext): LayoutVersions => {
  const { canvas, runner } = ctx;

  const queue = createLayoutVersionQueue({
    delayMs: LAYOUT_VERSION_DELAY_MS,
    emitStatus: ctx.emitStatus,
    isRunning: (projectId, directionId) =>
      runner.isRunning(projectId, directionId),
    ownerOf: (project) => canvas.ownerOf(project),
    recordVersion: (project, direction, version) =>
      ctx.recordVersion(project, direction, version),
    versions: ctx.versions,
    withDirection: ctx.withDirection,
  });

  canvas.onLayoutChange?.((project, change, source) => {
    if (LAYOUT_VERSION_SOURCES.has(source)) {
      queue.note(project, layoutLabel(change));
    }
  });

  return { flushLayoutVersions: queue.flushAll };
};

export { startLayoutVersions };

export type { LayoutVersions };
