import { assertSafeId } from "../../platform/errors/index.js";

interface ThumbViewport {
  readonly height: number;
  readonly width: number;
}

const THUMB_VIEWPORT: ThumbViewport = { height: 800, width: 1280 };

const MIN_DIFF_SIDE = 320;
const MAX_DIFF_WIDTH = 2560;
const MAX_DIFF_HEIGHT = 1600;

const toClampedNumber = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.round(Math.min(max, Math.max(min, value)));
};

const toClampedViewport = (width: number, height: number): ThumbViewport => ({
  height: toClampedNumber(height, MIN_DIFF_SIDE, MAX_DIFF_HEIGHT),
  width: toClampedNumber(width, MIN_DIFF_SIDE, MAX_DIFF_WIDTH),
});

const toVersionThumbName = (versionId: string): string =>
  `vp-${assertSafeId(versionId, "versionId")}.png`;

const toDiffThumbName = (
  beforeId: string,
  afterId: string,
  viewport: ThumbViewport
): string =>
  `diffp-${assertSafeId(beforeId, "versionId")}-${assertSafeId(afterId, "versionId")}-${viewport.width}x${viewport.height}.png`;

export {
  THUMB_VIEWPORT,
  toClampedViewport,
  toDiffThumbName,
  toVersionThumbName,
};

export type { ThumbViewport };
