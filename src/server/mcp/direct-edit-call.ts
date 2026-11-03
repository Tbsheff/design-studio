import {
  directEditRuntimeOf,
  type DirectEditRuntime,
} from "../direct-edit/index.js";
import { EditError, RUN_BUSY } from "./edit-deps.js";
import { mcpErrorText } from "./error-copy.js";

interface DirectionRef {
  readonly directionId: string;
  readonly projectId: string;
}

const STUDIO_OFF = "The studio runtime is not ready. Restart Design Studio.";

const codeOf = (error: unknown): string | undefined => {
  const { code } = error as { code?: unknown };

  return typeof code === "string" ? code : undefined;
};

const toEditError = (error: unknown): EditError => {
  const message = error instanceof Error ? error.message : String(error);
  const code = codeOf(error);

  if (code === "run_in_progress") {
    return new EditError(RUN_BUSY, code);
  }

  return new EditError(mcpErrorText(message), code);
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
    throw toEditError(error);
  }
};

export { directEditCall };

export type { DirectionRef };
