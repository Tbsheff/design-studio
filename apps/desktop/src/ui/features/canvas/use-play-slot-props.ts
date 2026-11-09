import type { DeviceFrameId, DeviceOrientation } from "@design-studio/contracts/device-frame";

import { tagFrame } from "../../platform/bridge.js";
import { toCommentInput } from "./play-comment-model.js";
import { baseOf } from "./play-model.js";
import type { PlayModeProps, StageSize } from "./play-model.js";
import type { BaseSlotsProps, BindFrame } from "./play-slot-types.js";
import type { PlayCommentMode } from "./play-comment-model.js";
import { useHotspotHints } from "./use-hotspot-hints.js";
import type { PlayState } from "./use-play.js";

interface SlotPropsInput {
  readonly device: DeviceFrameId | null;
  readonly mode: PlayCommentMode;
  readonly orientation: DeviceOrientation;
  readonly play: PlayState;
  readonly props: PlayModeProps;
  readonly stage: StageSize;
}

interface SlotPropsState {
  readonly isHints: boolean;
  readonly onHints: (isEnabled: boolean) => void;
  readonly slotProps: BaseSlotsProps;
}

const usePlaySlotProps = (input: SlotPropsInput): SlotPropsState => {
  const { device, mode, orientation, play, props, stage } = input;
  const { elements, slots } = play;
  const { sandbox } = props;

  const bind: BindFrame = (token) => (el) => {
    elements.current[token] = tagFrame(el, token);
  };

  const hints = useHotspotHints({ elements, props, slots });
  const { flashCount, isEnabled, isHeld, setEnabled: onHints, spots } = hints;
  const base = baseOf(slots);

  const comment = toCommentInput({
    device,
    elements,
    mode,
    orientation,
    props,
    slots,
    stage,
  });

  const slotProps = {
    base,
    bind,
    comment,
    device,
    flashCount,
    isHeld,
    orientation,
    sandbox,
    spots,
    stage,
  };

  return { isHints: isEnabled, onHints, slotProps };
};

export { usePlaySlotProps };
