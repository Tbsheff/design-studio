import type { DeviceFrameId } from "@design-studio/contracts/device-frame";
import type { ReactElement } from "react";

import { toSlotLayout } from "./device-frame-model.js";
import { PlayFrame } from "./play-frame.js";
import { slotClass, slotStyle } from "./play-model.js";
import type { Motion, Slot, StageSize } from "./play-model.js";

interface SlotViewProps {
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
      style={slotStyle(timing)}
      data-frame-id={frame.id}
      data-testid={toOverlayTestId(slot)}
    >
      <PlayFrame layout={layout} src={slot.src} sandbox={sandbox} bind={bind} />
    </div>
  );
};

export { SlotView };
