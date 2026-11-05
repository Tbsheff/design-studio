// @generated
import type { TextStyleActions } from "@design-studio/actions/text-style/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyTextStyleHandle } from "./apply.js";
import { handle as createTextStyleHandle } from "./create.js";
import { handle as inspectTextStyleHandle } from "./inspect.js";
import { handle as updateTextStyleHandle } from "./update.js";

const TextStyleEntries = {
  applyTextStyle: { handle: applyTextStyleHandle },
  createTextStyle: { handle: createTextStyleHandle },
  inspectTextStyle: { handle: inspectTextStyleHandle },
  updateTextStyle: { handle: updateTextStyleHandle },
} satisfies Entries<typeof TextStyleActions>;

export { TextStyleEntries };
