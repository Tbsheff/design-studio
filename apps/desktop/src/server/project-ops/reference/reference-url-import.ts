import { rm } from "node:fs/promises";

import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Direction, Project } from "@design-studio/contracts";
import { Effect } from "effect";

import { attemptKnown } from "../../platform/attempt/index.js";
import { runReferenceUrlCapture } from "../../share/index.js";
import { importReferenceInto } from "../../store/index.js";
import { attemptProjectOps } from "../project-ops-runtime.js";

interface UrlImportSource {
  readonly data: string | null;
  readonly name: string | null;
  readonly path: string | null;
}

interface UrlImportCommand {
  readonly direction: Direction;
  readonly project: Project;
  readonly source: UrlImportSource;
  readonly url: string;
}

const runUrlImport = Effect.fn("ReferenceWriter.importUrl")(function* run(
  command: UrlImportCommand
) {
  if (command.source.data !== null || command.source.path !== null) {
    return yield* new BadRequest({
      message: "Give url, path or data, not more than one.",
    });
  }

  const captured = yield* attemptProjectOps((runtime) =>
    runReferenceUrlCapture({
      direction: command.direction,
      isLoopbackAllowed: runtime.config.fetchAllowLoopback === true,
      preview: runtime.preview,
      project: command.project,
      url: command.url,
    })
  );

  return yield* attemptKnown(() =>
    importReferenceInto({
      data: null,
      fileName: null,
      name: command.source.name ?? captured.host,
      path: captured.directory,
      workTree: command.direction.workTree,
    })
  ).pipe(
    Effect.ensuring(
      Effect.promise(() =>
        rm(captured.directory, { force: true, recursive: true })
      )
    )
  );
});

export { runUrlImport };

export type { UrlImportCommand };
