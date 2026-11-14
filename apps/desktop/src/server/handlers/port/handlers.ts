// @generated
import type { PortActions } from "@design-studio/actions/port/index";

import type { Entries } from "../_core/handler.js";
import {
  handle as applyPortHandle,
  preview as applyPortPreview,
} from "./apply.js";
import { handle as inspectPortHandle } from "./inspect.js";
import {
  handle as startPortHandle,
  preview as startPortPreview,
} from "./start.js";

const PortEntries = {
  applyPort: { handle: applyPortHandle, preview: applyPortPreview },
  inspectPort: { handle: inspectPortHandle },
  startPort: { handle: startPortHandle, preview: startPortPreview },
} satisfies Entries<typeof PortActions>;

export { PortEntries };
