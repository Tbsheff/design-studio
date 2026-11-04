import { createContext } from "react";
import type { ReactNode } from "react";

interface FrameStateSlotArgs {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly projectId: string;
}

type FrameStateSlot = (args: FrameStateSlotArgs) => ReactNode;

const FrameStateSlotContext = createContext<FrameStateSlot | null>(null);

export { FrameStateSlotContext };

export type { FrameStateSlot, FrameStateSlotArgs };
