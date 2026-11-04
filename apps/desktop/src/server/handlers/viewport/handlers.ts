// @generated
import type { ViewportActions } from "@design-studio/actions/viewport/index";
import type { Entries } from "../_core/handler.js";
import { handle as createViewportHandle } from "./create.js";
import { handle as runViewportHandle } from "./run.js";

const ViewportEntries = {
  createViewport: { handle: createViewportHandle },
  runViewport: { handle: runViewportHandle },
} satisfies Entries<typeof ViewportActions>;

export { ViewportEntries };
