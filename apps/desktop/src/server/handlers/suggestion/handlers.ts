// @generated
import type { SuggestionActions } from "@design-studio/actions/suggestion/index";

import type { Entries } from "../_core/handler.js";
import { handle as runSuggestionHandle } from "./run.js";

const SuggestionEntries = {
  runSuggestion: { handle: runSuggestionHandle },
} satisfies Entries<typeof SuggestionActions>;

export { SuggestionEntries };
