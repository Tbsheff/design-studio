// @generated
import type { SpellingActions } from "@design-studio/actions/spelling/index";

import type { Entries } from "../_core/handler.js";
import { handle as inspectSpellingHandle } from "./inspect.js";
import { handle as setSpellingHandle } from "./set.js";

const SpellingEntries = {
  inspectSpelling: { handle: inspectSpellingHandle },
  setSpelling: { handle: setSpellingHandle },
} satisfies Entries<typeof SpellingActions>;

export { SpellingEntries };
