import { Effect } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { CanvasService } from "../canvas/service.js";
import { loadConfig } from "../platform/config/index.js";
import type { CommentStore } from "../store/comments.js";
import { NotFoundError } from "../store/errors.js";
import type { ExportDeps } from "./source.js";

interface ExportRuntime extends ExportDeps {
  readonly canvas: CanvasService | null;
  readonly comments: CommentStore;
  readonly dataDir: string;
  readonly projectsFolder: (() => Promise<string>) | null;
  readonly secrets: string[];
}

type ExportError = BadRequest | NotFound;

const NOT_READY =
  "Export is not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, ExportRuntime>();

const bindExportRuntime = (dataDir: string, runtime: ExportRuntime): void => {
  runtimes.set(dataDir, runtime);
};

const toExportRuntime = (dataDir: string): ExportRuntime | null =>
  runtimes.get(dataDir) ?? null;

const toExportError = (error: Cause.UnknownError): ExportError => {
  if (error.cause instanceof NotFoundError) {
    return new NotFound({ message: error.cause.message });
  }

  if (error.cause instanceof Error) {
    return new BadRequest({ message: error.cause.message });
  }

  return new BadRequest({ message: String(error.cause) });
};

const attemptExport = <Value>(
  task: (runtime: ExportRuntime) => Promise<Value>
): Effect.Effect<Value, ExportError> =>
  Effect.gen(function* withRuntime() {
    const { dataDir } = loadConfig();
    const runtime = toExportRuntime(dataDir);

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* Effect.tryPromise(() => task(runtime)).pipe(
      Effect.mapError((failure) => toExportError(failure))
    );
  });

export { attemptExport, bindExportRuntime, toExportRuntime };

export type { ExportError, ExportRuntime };
