import { targetFrame } from "@design-studio/contracts/link-interaction";
import {
  ACTION_LABELS,
  isBackTarget,
  linkAction,
  sourceName,
} from "@design-studio/contracts/links";
import type { PrototypeLink } from "@design-studio/contracts/links";

import { frameName } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";

const toFrameTitle = (frame: CanvasFrame): string =>
  frame.label ?? frame.path ?? frameName(frame);

const toTitleById = (frames: CanvasFrame[], id: string): string => {
  const frame = frames.find((item) => item.id === id);

  if (frame) {
    return toFrameTitle(frame);
  }

  return "missing frame";
};

const toTargetName = (frames: CanvasFrame[], link: PrototypeLink): string => {
  if (isBackTarget(link.to)) {
    return "Back";
  }

  const to = targetFrame(link.to);

  if (to) {
    return toTitleById(frames, to);
  }

  return ACTION_LABELS[linkAction(link)];
};

const toLinkTitle = (frames: CanvasFrame[], link: PrototypeLink): string =>
  `${sourceName(link.from)} in ${toTitleById(frames, link.from.frame)} → ${toTargetName(frames, link)}`;

export { toFrameTitle, toLinkTitle };
