// @generated
import type { ImpactActions } from "@design-studio/actions/impact/index";

import type { Entries } from "../_core/handler.js";
import { handle as getImpactHandle } from "./get.js";
import { handle as runImpactHandle } from "./run.js";

const ImpactEntries = {
  getImpact: { handle: getImpactHandle },
  runImpact: { handle: runImpactHandle },
} satisfies Entries<typeof ImpactActions>;

export { ImpactEntries };
