import type { Input } from "@design-studio/actions/_core/action";
import type { renameToken } from "@design-studio/actions/token/rename";
import { Effect } from "effect";

import { TokenSweepRunner } from "../../token-sweep/index.js";
import type { Handle } from "../_core/handler.js";

type RenameTokenInput = Input<typeof renameToken>;

const handle = Effect.fn("token.rename")(function* run(
  input: RenameTokenInput
) {
  const sweeper = yield* TokenSweepRunner;

  const result = yield* sweeper.rename({
    directionId: input.directionId,
    name: input.name,
    newName: input.newName,
    projectId: input.projectId,
  });

  return {
    changedFiles: result.changedFiles,
    newName: input.newName,
    replacedCount: result.replacedCount,
    token: input.name,
    versionId: result.versionId,
  };
}) satisfies Handle<typeof renameToken>;

export { handle };
