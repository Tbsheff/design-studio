import { PNG } from "pngjs";

interface ExpandTarget {
  readonly aspect: string;
  readonly box: { readonly height: number; readonly width: number } | null;
}

interface Size {
  readonly height: number;
  readonly width: number;
}

const CHANNELS = 4;

const HALF = 2;

const SIDE_LIMIT = 4096;

const toRatio = (target: ExpandTarget): number | null => {
  if (target.aspect === "fill") {
    if (target.box === null) {
      return null;
    }

    return target.box.width / target.box.height;
  }

  const [across, down] = target.aspect.split(":").map(Number);

  if (!across || !down) {
    return null;
  }

  return across / down;
};

const toExpandedSize = (source: Size, target: ExpandTarget): Size | null => {
  const ratio = toRatio(target);

  if (ratio === null) {
    return null;
  }

  const wider = Math.max(source.width, Math.ceil(source.height * ratio));
  const taller = Math.max(source.height, Math.ceil(source.width / ratio));

  if (source.width / source.height < ratio) {
    return { height: source.height, width: wider };
  }

  return { height: taller, width: source.width };
};

const toMirrored = (at: number, length: number): number => {
  const period = length * HALF;
  const wrapped = ((at % period) + period) % period;

  if (wrapped < length) {
    return wrapped;
  }

  return period - 1 - wrapped;
};

const toExpandedPng = (
  png: PNG,
  target: ExpandTarget,
  isMirrored: boolean
): PNG => {
  const size = toExpandedSize(png, target) ?? png;
  const out = new PNG({ height: size.height, width: size.width });
  const left = Math.floor((size.width - png.width) / HALF);
  const top = Math.floor((size.height - png.height) / HALF);

  for (let row = 0; row < size.height; row += 1) {
    for (let column = 0; column < size.width; column += 1) {
      const x = column - left;
      const y = row - top;
      const isInside = x >= 0 && x < png.width && y >= 0 && y < png.height;

      if (isInside || isMirrored) {
        const from =
          (toMirrored(y, png.height) * png.width + toMirrored(x, png.width)) *
          CHANNELS;

        png.data.copy(
          out.data,
          (row * size.width + column) * CHANNELS,
          from,
          from + CHANNELS
        );
      }
    }
  }

  return out;
};

export { SIDE_LIMIT, toExpandedPng, toExpandedSize };

export type { ExpandTarget };
