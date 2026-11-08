// @generated
import type { CritiqueActions } from "@design-studio/actions/critique/index";

import type { Entries } from "../_core/handler.js";
import { handle as getAttentionCritiqueHandle } from "./get-attention.js";
import { handle as getCritiqueHandle } from "./get.js";
import { handle as runAttentionCritiqueHandle } from "./run-attention.js";
import { handle as runCritiqueHandle } from "./run.js";

const CritiqueEntries = {
  getAttentionCritique: { handle: getAttentionCritiqueHandle },
  getCritique: { handle: getCritiqueHandle },
  runAttentionCritique: { handle: runAttentionCritiqueHandle },
  runCritique: { handle: runCritiqueHandle },
} satisfies Entries<typeof CritiqueActions>;

export { CritiqueEntries };
