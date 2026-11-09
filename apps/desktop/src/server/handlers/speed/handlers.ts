// @generated
import type { SpeedActions } from "@design-studio/actions/speed/index";

import type { Entries } from "../_core/handler.js";
import { handle as getSpeedHandle } from "./get.js";
import { handle as runSpeedHandle } from "./run.js";

const SpeedEntries = {
  getSpeed: { handle: getSpeedHandle },
  runSpeed: { handle: runSpeedHandle },
} satisfies Entries<typeof SpeedActions>;

export { SpeedEntries };
