import type { RefObject } from "react";

import { toStillKey } from "./frame-still-model.js";
import type { PassiveProps, PassiveUrl } from "./passive-frame-model.js";
import { toPassiveUrls } from "./passive-frame-model.js";
import { usePassiveMount } from "./passive-mount.js";
import { useFrameLive } from "./use-frame-live.js";
import { useFrameStill, useStillSwap } from "./use-frame-still.js";

interface PassiveMode {
  readonly urls: PassiveUrl[];
  readonly still: string | null;
  readonly onPointerEnter: () => void;
  readonly onPointerLeave: () => void;
}

const toShownStill = (still: string | null, isKept: boolean): string | null => {
  if (!isKept) {
    return null;
  }

  return still;
};

const usePassiveMode = (
  box: RefObject<HTMLDivElement | null>,
  props: PassiveProps
): PassiveMode => {
  const { frame, label, nextSrc, onNextLoad, projectId, sources, src } = props;
  const { directionId } = label;
  const frameId = frame.id;

  const armed = usePassiveMount(box);
  const live = useFrameLive(box, sources, frame.id);
  const isLive = armed && live.isLive;

  useStillSwap(!isLive, nextSrc, frame.id, onNextLoad);

  const still = useFrameStill(sources.stills, {
    isWanted: armed && live.isNear && !isLive,
    key: toStillKey(frame.id, src, frame.width, frame.height),
    request: { directionId, frameId, projectId },
  });

  return {
    onPointerEnter: live.onPointerEnter,
    onPointerLeave: live.onPointerLeave,
    still: toShownStill(still, live.isKept),
    urls: toPassiveUrls(isLive, src, nextSrc),
  };
};

export { usePassiveMode };

export type { PassiveMode };
