import { PNG } from "pngjs";

import {
  diffMask,
  resizePng,
  topOf,
} from "../../preview/picture-diff/index.js";

const THUMB_WIDTH = 320;

const THUMB_HEIGHT = 240;

const PERCENT = 100;

const TENTH_PERCENT = 100;

const NOISE_PCT = 0.02;

interface RouteDiff {
  readonly after: string;
  readonly before: string;
  readonly changedPct: number;
  readonly diff: string;
}

const toThumb = (png: PNG): string => {
  const width = Math.min(THUMB_WIDTH, png.width);
  const height = Math.max(1, Math.round((png.height * width) / png.width));
  const small = topOf(resizePng(png, width, height), THUMB_HEIGHT);

  return `data:image/png;base64,${PNG.sync.write(small).toString("base64")}`;
};

const toPct = (
  changed: number,
  width: number,
  height: number,
  grown: number
): number => {
  if (width === 0 || height + grown === 0) {
    return 0;
  }

  const raw =
    ((changed + grown * width) / (width * (height + grown))) * PERCENT;

  if (raw < NOISE_PCT) {
    return 0;
  }

  return Math.round(raw * TENTH_PERCENT) / TENTH_PERCENT;
};

const toPng = (encoded: string): PNG =>
  PNG.sync.read(Buffer.from(encoded, "base64"));

const toRouteDiff = (
  beforeEncoded: string,
  afterEncoded: string
): RouteDiff => {
  const before = toPng(beforeEncoded);
  const after = toPng(afterEncoded);
  const mask = diffMask(before, after);
  const grown = Math.abs(before.height - after.height);

  return {
    after: toThumb(after),
    before: toThumb(before),
    changedPct: toPct(mask.changed, mask.width, mask.height, grown),
    diff: toThumb(PNG.sync.read(mask.png)),
  };
};

const toChangedPct = (beforeEncoded: string, afterEncoded: string): number => {
  const before = toPng(beforeEncoded);
  const after = toPng(afterEncoded);
  const mask = diffMask(before, after);
  const grown = Math.abs(before.height - after.height);

  return toPct(mask.changed, mask.width, mask.height, grown);
};

const PIXEL_BYTES = 4;

const isBlankShot = (encoded: string): boolean => {
  const { data } = toPng(encoded);

  for (let at = PIXEL_BYTES; at < data.length; at += PIXEL_BYTES) {
    if (data.compare(data, at, at + PIXEL_BYTES, 0, PIXEL_BYTES) !== 0) {
      return false;
    }
  }

  return true;
};

export { isBlankShot, toChangedPct, toRouteDiff, toThumb };

export type { RouteDiff };
