import type { Input } from "../../../shared/actions/_core/action.js";
import type { createProject } from "../../../shared/actions/project/create.js";
import {
  createProjectIn,
  projectOpsRuntimeOf,
} from "../../project-ops/index.js";
import { EditError } from "../edit-deps.js";
import { mcpErrorText } from "../error-copy.js";

type CreateInput = Input<typeof createProject>;

const STUDIO_OFF = "The studio runtime is not ready. Restart Design Studio.";

const messageOf = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const createProjectCall = async (
  input: CreateInput
): Promise<Awaited<ReturnType<typeof createProjectIn>>> => {
  const runtime = projectOpsRuntimeOf();

  if (runtime === null) {
    throw new EditError(STUDIO_OFF);
  }

  try {
    return await createProjectIn(runtime, input);
  } catch (error) {
    throw new EditError(mcpErrorText(messageOf(error)));
  }
};

export { createProjectCall };
