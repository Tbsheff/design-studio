import type { WireOutput } from "@design-studio/actions/_core/action";
import type { setFrameHeightsCanvas } from "@design-studio/actions/canvas/set-frame-heights";

import { copy } from "./copy.js";

type FramesFittedWire = WireOutput<typeof setFrameHeightsCanvas>;

type FittedFrameWire = FramesFittedWire["frames"][number];

interface FrameFitDetail {
  readonly frameIds: readonly string[];
}

const FRAME_FIT_EVENT = "studio:frame-fit";

const FIT_NOTICE_MS = 6000;

const toFitFrameIds = (event: Event): readonly string[] => {
  if (!(event instanceof CustomEvent)) {
    return [];
  }

  const detail: FrameFitDetail | null = event.detail ?? null;

  return detail?.frameIds ?? [];
};

const requestFrameFit = (frameIds: readonly string[]): void => {
  const detail: FrameFitDetail = { frameIds };

  globalThis.dispatchEvent(new CustomEvent(FRAME_FIT_EVENT, { detail }));
};

const toFittedText = (frame: FittedFrameWire): string =>
  `${frame.label ?? frame.id}${copy.frameFitTo}${frame.newHeight}${copy.frameFitPixels}`;

const toFitNotice = (output: FramesFittedWire): string => {
  const changed = output.frames.filter(
    (frame) => frame.newHeight !== frame.oldHeight
  );

  const warnings = output.warnings.join(" ");

  if (changed.length === 0) {
    return `${copy.frameFitNone} ${warnings}`.trim();
  }

  const sizes = changed.map((frame) => toFittedText(frame)).join(", ");

  return `${copy.frameFitDone}${sizes}. ${warnings}`.trim();
};

export {
  FIT_NOTICE_MS,
  FRAME_FIT_EVENT,
  requestFrameFit,
  toFitFrameIds,
  toFitNotice,
};

export type { FrameFitDetail, FramesFittedWire };
