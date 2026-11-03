// @generated
import type { ViewportActions } from "../../../shared/actions/viewport/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as createViewportHandle } from "./create.js";
import { handle as inspectViewportHandle } from "./inspect.js";

const ViewportEntries = {
  createViewport: { handle: createViewportHandle },
  inspectViewport: { handle: inspectViewportHandle },
} satisfies Entries<typeof ViewportActions>;

export { ViewportEntries };
