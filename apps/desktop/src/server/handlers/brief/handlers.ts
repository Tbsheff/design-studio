// @generated
import type { BriefActions } from "@design-studio/actions/brief/index";

import type { Entries } from "../_core/handler.js";
import { handle as runBriefHandle } from "./run.js";

const BriefEntries = {
  runBrief: { handle: runBriefHandle },
} satisfies Entries<typeof BriefActions>;

export { BriefEntries };
