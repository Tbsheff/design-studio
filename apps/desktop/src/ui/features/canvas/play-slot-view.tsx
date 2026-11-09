import type { DeviceFrameId } from "@design-studio/contracts/device-frame";
import type { ReactElement, ReactNode } from "react";

import { toSlotLayout } from "./device-frame-model.js";
import { PlayFrame } from "./play-frame.js";
import { slotClass, toSlotViewStyle } from "./play-model.js";
import type { Motion, Slot, StageSize } from "./play-model.js";

interface SlotViewProps {
  readonly hotspots: ReactNode;
  readonly slot: Slot;
  readonly isLeaving: boolean;
  readonly timing: Motion;
  readonly stage: StageSize;
  readonly device: DeviceFrameId | null;
  readonly sandbox?: string;
  readonly bind: (el: HTMLIFrameElement | null) => void;
}

const toViewSlot = (slot: Slot, isLeaving: boolean, timing: Motion): Slot => {
  if (isLeaving) {
    return { ...slot, transition: timing.transition };
  }

  return slot;
};

const toOverlayTestId = (slot: Slot): string | null => {
  if (slot.overlay) {
    return "play-overlay";
  }

  return null;
};

const SlotView = ({
  hotspots,
  slot,
  isLeaving,
  timing,
  stage,
  device,
  sandbox,
  bind,
}: SlotViewProps): ReactElement => {
  const layout = toSlotLayout(slot, stage, device);
  const { frame } = slot;

  return (
    <div
      className={slotClass(toViewSlot(slot, isLeaving, timing), isLeaving)}
      style={toSlotViewStyle(timing, slot)}
      data-frame-id={frame.id}
      data-testid={toOverlayTestId(slot)}
    >
      <PlayFrame
        layout={layout}
        src={slot.src}
        sandbox={sandbox}
        bind={bind}
        hotspots={hotspots}
      />
    </div>
  );
};

export { SlotView };
