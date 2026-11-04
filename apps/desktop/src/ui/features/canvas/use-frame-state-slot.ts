import { useContext } from "react";

import { FrameStateSlotContext } from "./frame-state-slot-context.js";
import type { FrameStateSlot } from "./frame-state-slot-context.js";

const useFrameStateSlot = (): FrameStateSlot | null =>
  useContext(FrameStateSlotContext);

export { useFrameStateSlot };
