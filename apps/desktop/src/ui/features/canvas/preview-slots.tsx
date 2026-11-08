import type { MutableRefObject, ReactElement } from "react";

import { PreviewSlot } from "./preview-slot.js";

interface SlotFrames {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  onFrameLoad: (token: string) => void;
}

interface PreviewSlotsProps {
  readonly frames: SlotFrames;
  readonly sandbox?: string;
  readonly viewport: { width: number; height: number };
}

const toPosition = (
  token: string,
  frontToken: string | null
): "front" | "back" => {
  if (token === frontToken) {
    return "front";
  }

  return "back";
};

const PreviewSlots = ({
  frames,
  sandbox,
  viewport,
}: PreviewSlotsProps): ReactElement => {
  const { elements, frontToken, onFrameLoad, slots } = frames;

  return (
    <>
      {slots.map((slot) => (
        <PreviewSlot
          key={slot.token}
          token={slot.token}
          src={slot.src}
          position={toPosition(slot.token, frontToken)}
          sandbox={sandbox}
          viewport={viewport}
          elements={elements}
          onFrameLoad={onFrameLoad}
        />
      ))}
    </>
  );
};

export { PreviewSlots };
