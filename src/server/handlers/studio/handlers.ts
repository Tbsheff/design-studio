// @generated
import type { StudioActions } from "../../../shared/actions/studio/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as healthStudioHandle } from "./health.js";

const StudioEntries = {
  healthStudio: { handle: healthStudioHandle },
} satisfies Entries<typeof StudioActions>;

export { StudioEntries };
