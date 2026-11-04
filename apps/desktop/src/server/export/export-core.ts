import { Effect } from "effect";

import type { CanvasService } from "../canvas/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../platform/runtime-slot/index.js";
import type { CommentStore } from "../store/comments.js";
import type { ExportDeps } from "./source.js";

interface ExportRuntime extends ExportDeps {
  readonly canvas: CanvasService | null;
  readonly comments: CommentStore;
  readonly dataDir: string;
  readonly projectsFolder: (() => Promise<string>) | null;
  readonly secrets: string[];
}

type ExportError = KnownFailure;

const runtimes = makeRuntimeSlot<ExportRuntime>("Export");

const bindExportRuntime = (dataDir: string, runtime: ExportRuntime): void => {
  runtimes.bindAt(dataDir, runtime);
};

const toExportRuntime = (dataDir: string): ExportRuntime | null =>
  runtimes.peekAt(dataDir);

const attemptExport = <Value>(
  task: (runtime: ExportRuntime) => Promise<Value>
): Effect.Effect<Value, ExportError> =>
  Effect.gen(function* withRuntime() {
    const { dataDir } = loadConfig();
    const runtime = yield* requireBound("Export", toExportRuntime(dataDir));

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptExport, bindExportRuntime, toExportRuntime };

export type { ExportError, ExportRuntime };
