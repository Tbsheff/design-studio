// @generated
import type { MarkupActions } from "@design-studio/actions/markup/index";

import type { Entries } from "../_core/handler.js";
import { handle as createMarkupHandle } from "./create.js";

const MarkupEntries = {
  createMarkup: { handle: createMarkupHandle },
} satisfies Entries<typeof MarkupActions>;

export { MarkupEntries };
