// @generated
import type { TextActions } from "@design-studio/actions/text/index";

import type { Entries } from "../_core/handler.js";
import { handle as inspectTextHandle } from "./inspect.js";
import { handle as updateTextHandle } from "./update.js";

const TextEntries = {
  inspectText: { handle: inspectTextHandle },
  updateText: { handle: updateTextHandle },
} satisfies Entries<typeof TextActions>;

export { TextEntries };
