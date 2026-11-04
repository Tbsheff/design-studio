import type { AnyAction } from "@design-studio/actions/_core/action";
import type { WireBody } from "@design-studio/actions/_core/wire";
import { Exit } from "effect";

import type { WireArgs } from "../handlers/_core/run-action.js";
import { failureOf, toWireError } from "../handlers/_core/wire-error.js";
import { EditError, RUN_BUSY } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import { mcpErrorText } from "./error-copy.js";
import { legacyCaller } from "./legacy/caller-scope.js";
import { runActionExit } from "./registry.js";

const RUNTIME_OFF =
  "The studio runtime is not ready, so this tool is not available. Restart Design Studio.";

const RUN_IN_PROGRESS = "run_in_progress";

const toEditError = (body: WireBody): EditError => {
  if (body.error === RUN_IN_PROGRESS) {
    return new EditError(RUN_BUSY, RUN_IN_PROGRESS);
  }

  return new EditError(mcpErrorText(body.message), body.error);
};

const roundTrip = <Value, Source>(value: Source): Value => {
  const text = JSON.stringify(value);

  return JSON.parse(text) as Value;
};

const callAction = async <Output, Input extends object = object>(
  deps: Pick<EditDeps, "runtime">,
  action: AnyAction,
  input: Input
): Promise<Output> => {
  const runtime = deps.runtime ?? null;

  if (runtime === null) {
    throw new EditError(RUNTIME_OFF);
  }

  const exit = await runActionExit(
    runtime,
    action,
    roundTrip<WireArgs, Input>(input),
    legacyCaller()
  );

  if (Exit.isSuccess(exit)) {
    return roundTrip<Output, object>(exit.value);
  }

  throw toEditError(toWireError(failureOf(exit)).body);
};

export { callAction };
