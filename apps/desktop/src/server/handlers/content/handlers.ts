// @generated
import type { ContentActions } from "../../../shared/actions/content/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as applyContentHandle } from "./apply.js";

const ContentEntries = {
  applyContent: { handle: applyContentHandle },
} satisfies Entries<typeof ContentActions>;

export { ContentEntries };
