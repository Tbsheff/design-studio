import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { scaleFor, slotClass, slotStyle } from "./play-model.js";
import type { Motion, Slot, StageSize } from "./play-model.js";

interface SlotViewProps {
  readonly slot: Slot;
  readonly isLeaving: boolean;
  readonly timing: Motion;
  readonly stage: StageSize;
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
  sandbox,
  bind,
}: SlotViewProps): ReactElement => {
  const scale = scaleFor(slot, stage);
  const { frame } = slot;
  const frameHeight = frame.height * scale;
  const frameWidth = frame.width * scale;

  const frameStyle = useMemo(
    () => ({ height: frameHeight, width: frameWidth }),
    [frameHeight, frameWidth]
  );

  const iframeStyle = useMemo(
    () => ({ transform: `scale(${scale})` }),
    [scale]
  );

  return (
    <div
      className={slotClass(toViewSlot(slot, isLeaving, timing), isLeaving)}
      style={slotStyle(timing)}
      data-frame-id={frame.id}
      data-testid={toOverlayTestId(slot)}
    >
      <div className="play-frame" style={frameStyle}>
        <iframe
          ref={bind}
          title={copy.prototypeFrame}
          src={slot.src}
          sandbox={sandbox}
          width={frame.width}
          height={frame.height}
          style={iframeStyle}
        />
      </div>
    </div>
  );
};

export { SlotView };
