import { directEditRuntimeOf } from "../direct-edit/index.js";
import type { DirectEditRuntime } from "../direct-edit/index.js";
import { EditError, RUN_BUSY } from "./edit-deps.js";
import { mcpErrorText } from "./error-copy.js";

interface DirectionRef {
  readonly directionId: string;
  readonly projectId: string;
}

interface CodedError extends Error {
  readonly code?: string;
}

const STUDIO_OFF = "The studio runtime is not ready. Restart Design Studio.";

const RUN_IN_PROGRESS = "run_in_progress";

const toEditError = (error: CodedError): EditError => {
  if (error.code === RUN_IN_PROGRESS) {
    return new EditError(RUN_BUSY, RUN_IN_PROGRESS);
  }

  return new EditError(mcpErrorText(error.message), error.code ?? null);
};

const directEditCall = async <Value>(
  ref: DirectionRef,
  task: (runtime: DirectEditRuntime, ref: DirectionRef) => Promise<Value>
): Promise<Value> => {
  const runtime = directEditRuntimeOf();

  if (runtime === null) {
    throw new EditError(STUDIO_OFF);
  }

  try {
    return await task(runtime, ref);
  } catch (error) {
    if (error instanceof Error) {
      throw toEditError(error);
    }

    throw new EditError(mcpErrorText(String(error)));
  }
};

export { directEditCall };

export type { DirectionRef };
