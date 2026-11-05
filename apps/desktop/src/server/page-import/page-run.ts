import type { Effect } from "effect";

import { runDirectionWrite } from "../direct-edit/index.js";
import type { DirectionIds } from "../direct-edit/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { ConflictError } from "../platform/errors/index.js";
import type { PageImportRequest, PageImportResult } from "./deps.js";
import { importPageCopy } from "./import-page.js";
import { toPageFailure } from "./page-failure.js";

interface ImportPageCommand extends DirectionIds, PageImportRequest {}

const CLIENT = "ui";

const RUN_BUSY =
  "An agent run is working on this direction. Wait for it to end, then import the page.";

const runPageImport = (
  command: ImportPageCommand
): Effect.Effect<PageImportResult, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<PageImportResult> => {
      const { editDeps } = runtime;

      if (editDeps.runner.isRunning(project.id, direction.id)) {
        throw new ConflictError(RUN_BUSY);
      }

      const done = await importPageCopy(
        { canvas: runtime.canvas, direction, project },
        {
          name: command.name,
          selector: command.selector,
          url: command.url,
          width: command.width,
        },
        { client: CLIENT, deps: editDeps, history: editDeps.history ?? null }
      );

      return done.result;
    },
    toPageFailure
  );

export { runPageImport };

export type { ImportPageCommand };
