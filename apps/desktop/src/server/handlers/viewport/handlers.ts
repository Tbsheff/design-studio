// @generated
import type { ViewportActions } from "../../../shared/actions/viewport/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as createViewportHandle } from "./create.js";
import { handle as runViewportHandle } from "./run.js";

const ViewportEntries = {
  createViewport: { handle: createViewportHandle },
  runViewport: { handle: runViewportHandle },
} satisfies Entries<typeof ViewportActions>;

export { ViewportEntries };
