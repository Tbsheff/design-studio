// @generated
import type { PortActions } from "@design-studio/actions/port/index";

import type { Entries } from "../_core/handler.js";
import {
  handle as startPortHandle,
  preview as startPortPreview,
} from "./start.js";

const PortEntries = {
  startPort: { handle: startPortHandle, preview: startPortPreview },
} satisfies Entries<typeof PortActions>;

export { PortEntries };
