// @generated
import type { CompletionActions } from "@design-studio/actions/completion/index";

import type { Entries } from "../_core/handler.js";
import { handle as createCompletionHandle } from "./create.js";
import { handle as listCompletionHandle } from "./list.js";
import { handle as setCompletionHandle } from "./set.js";

const CompletionEntries = {
  createCompletion: { handle: createCompletionHandle },
  listCompletion: { handle: listCompletionHandle },
  setCompletion: { handle: setCompletionHandle },
} satisfies Entries<typeof CompletionActions>;

export { CompletionEntries };
