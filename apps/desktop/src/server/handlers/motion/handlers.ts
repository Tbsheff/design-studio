// @generated
import type { MotionActions } from "@design-studio/actions/motion/index";

import type { Entries } from "../_core/handler.js";
import { handle as inspectMotionHandle } from "./inspect.js";
import { handle as setMotionHandle } from "./set.js";

const MotionEntries = {
  inspectMotion: { handle: inspectMotionHandle },
  setMotion: { handle: setMotionHandle },
} satisfies Entries<typeof MotionActions>;

export { MotionEntries };
