// @generated
import type { CritiqueActions } from "@design-studio/actions/critique/index";

import type { Entries } from "../_core/handler.js";
import { handle as getCritiqueHandle } from "./get.js";
import { handle as runCritiqueHandle } from "./run.js";

const CritiqueEntries = {
  getCritique: { handle: getCritiqueHandle },
  runCritique: { handle: runCritiqueHandle },
} satisfies Entries<typeof CritiqueActions>;

export { CritiqueEntries };
