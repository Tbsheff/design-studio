import { Effect } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import type { CanvasService } from "../canvas/service.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
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

const NOT_READY =
  "Export is not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, ExportRuntime>();

const bindExportRuntime = (dataDir: string, runtime: ExportRuntime): void => {
  runtimes.set(dataDir, runtime);
};

const toExportRuntime = (dataDir: string): ExportRuntime | null =>
  runtimes.get(dataDir) ?? null;

const attemptExport = <Value>(
  task: (runtime: ExportRuntime) => Promise<Value>
): Effect.Effect<Value, ExportError> =>
  Effect.gen(function* withRuntime() {
    const { dataDir } = loadConfig();
    const runtime = toExportRuntime(dataDir);

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptExport, bindExportRuntime, toExportRuntime };

export type { ExportError, ExportRuntime };
