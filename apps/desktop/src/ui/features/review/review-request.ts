import {
  CANVAS_MAX_HEIGHT,
  CANVAS_MAX_SIDE,
} from "@design-studio/contracts/canvas-file";
import type { ReviewRequest } from "@design-studio/contracts/review";

interface ReviewFrame {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly path?: string;
}

const SIDE_MIN = 200;

const toWidth = (value: number): number =>
  Math.min(CANVAS_MAX_SIDE, Math.max(SIDE_MIN, Math.round(value)));

const toHeight = (value: number): number =>
  Math.min(CANVAS_MAX_HEIGHT, Math.max(SIDE_MIN, Math.round(value)));

const toReviewRequest = (frame: ReviewFrame): ReviewRequest => {
  const request: ReviewRequest = {
    frame: frame.id,
    height: toHeight(frame.height),
    width: toWidth(frame.width),
  };

  if (frame.path) {
    return { ...request, path: frame.path };
  }

  return request;
};

const toFrameKey = (directionId: string | null, frame: ReviewFrame): string =>
  `${directionId}|${frame.id}|${frame.path ?? ""}|${frame.width}x${frame.height}`;

export { toFrameKey, toReviewRequest };

export type { ReviewFrame };
