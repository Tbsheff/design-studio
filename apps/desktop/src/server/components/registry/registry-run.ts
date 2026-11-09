import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import type { Effect } from "effect";

import { runDirectionWrite } from "./deps.js";
import type { KnownFailure } from "./deps.js";
import { toRegistryFailure } from "./registry-failure.js";
import { runRegistryImportTask } from "./registry-import.js";
import type {
  ComponentImported,
  ImportComponentCommand,
} from "./registry-import.js";

const MAIN_DIRECTION = "main";

const runRegistryImportEffect = (
  command: ImportComponentCommand
): Effect.Effect<ComponentImported, KnownFailure | Unavailable> =>
  runDirectionWrite(
    {
      directionId: command.directionId ?? MAIN_DIRECTION,
      projectId: command.projectId,
    },
    (run) => runRegistryImportTask(run, command),
    toRegistryFailure
  );

export { runRegistryImportEffect };
