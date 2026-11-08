import type { ReviewRequest } from "@design-studio/contracts/review";

interface ReviewFrame {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly path?: string;
}

const SIDE_MIN = 200;
const SIDE_MAX = 4000;

const toSide = (value: number): number =>
  Math.min(SIDE_MAX, Math.max(SIDE_MIN, Math.round(value)));

const toReviewRequest = (frame: ReviewFrame): ReviewRequest => {
  const request: ReviewRequest = {
    frame: frame.id,
    height: toSide(frame.height),
    width: toSide(frame.width),
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
