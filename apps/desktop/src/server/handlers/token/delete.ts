import type { Input } from "@design-studio/actions/_core/action";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { deleteToken } from "@design-studio/actions/token/delete";
import { Effect } from "effect";

import { TokenUsageStore } from "../../design-system/index.js";
import { TokenSweepRunner } from "../../token-sweep/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteTokenInput = Input<typeof deleteToken>;

const toUseText = (useCount: number): string => {
  if (useCount === 1) {
    return "1 use";
  }

  return `${useCount} uses`;
};

const handle = Effect.fn("token.delete")(function* run(
  input: DeleteTokenInput
) {
  const usage = yield* TokenUsageStore;
  const sweeper = yield* TokenSweepRunner;

  const use = yield* usage.find({
    directionId: input.directionId,
    name: input.name,
    projectId: input.projectId,
  });

  if (use === null) {
    return yield* new NotFound({
      message: `No token ${input.name}. Use list_usage_token for the names.`,
    });
  }

  if (use.useCount > 0) {
    return yield* new Conflict({
      message: `${input.name} has ${toUseText(use.useCount)}. Change them before you delete the token.`,
    });
  }

  const result = yield* sweeper.remove({
    directionId: input.directionId,
    name: input.name,
    projectId: input.projectId,
  });

  return {
    changedFiles: result.changedFiles,
    token: input.name,
    versionId: result.versionId,
  };
}) satisfies Handle<typeof deleteToken>;

const preview = Effect.fn("token.delete.preview")(function* card(
  input: DeleteTokenInput
) {
  const usage = yield* TokenUsageStore;

  const use = yield* usage.find({
    directionId: input.directionId,
    name: input.name,
    projectId: input.projectId,
  });

  if (use === null) {
    return yield* new NotFound({
      message: `No token ${input.name}. Use list_usage_token for the names.`,
    });
  }

  if (use.useCount > 0) {
    return yield* new Conflict({
      message: `${input.name} has ${toUseText(use.useCount)}. Change them before you delete the token.`,
    });
  }

  return {
    action: "Delete a design token",
    detail: `Removes the definition ${input.name}: ${use.value} from the token files. Undo brings it back.`,
    title: `Delete the token ${input.name}`,
  };
}) satisfies Preview<typeof deleteToken>;

export { handle, preview };
