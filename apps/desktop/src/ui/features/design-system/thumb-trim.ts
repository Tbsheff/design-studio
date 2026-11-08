interface Box {
  height: number;
  left: number;
  top: number;
  width: number;
}

const TRIM_PAD = 8;
const TRIM_DIFF = 24;
const CHANNELS = 4;
const KEEP_RATIO = 0.9;

const toChannel = (data: Uint8ClampedArray, at: number): number =>
  data.at(at) ?? 0;

const differs = (data: Uint8ClampedArray, at: number): boolean => {
  let total = 0;

  for (let channel = 0; channel < CHANNELS; channel += 1) {
    total += Math.abs(toChannel(data, at + channel) - toChannel(data, channel));
  }

  return total > TRIM_DIFF;
};

const contentBox = (
  data: Uint8ClampedArray,
  width: number,
  height: number
): Box | null => {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let posY = 0; posY < height; posY += 1) {
    for (let posX = 0; posX < width; posX += 1) {
      if (differs(data, (posY * width + posX) * CHANNELS)) {
        left = Math.min(left, posX);
        right = Math.max(right, posX);
        top = Math.min(top, posY);
        bottom = Math.max(bottom, posY);
      }
    }
  }

  if (right < 0) {
    return null;
  }

  const leftNext = Math.max(0, left - TRIM_PAD);
  const topNext = Math.max(0, top - TRIM_PAD);

  return {
    height: Math.min(height, bottom + TRIM_PAD + 1) - topNext,
    left: leftNext,
    top: topNext,
    width: Math.min(width, right + TRIM_PAD + 1) - leftNext,
  };
};

const isNearlyFull = (box: Box, bitmap: ImageBitmap): boolean =>
  box.width >= bitmap.width * KEEP_RATIO &&
  box.height >= bitmap.height * KEEP_RATIO;

const trimmed = async (blob: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return blob;
  }

  ctx.drawImage(bitmap, 0, 0);

  const box = contentBox(
    ctx.getImageData(0, 0, bitmap.width, bitmap.height).data,
    bitmap.width,
    bitmap.height
  );

  if (!box || isNearlyFull(box, bitmap)) {
    return blob;
  }

  const out = new OffscreenCanvas(box.width, box.height);

  out
    .getContext("2d")
    ?.drawImage(
      canvas,
      box.left,
      box.top,
      box.width,
      box.height,
      0,
      0,
      box.width,
      box.height
    );

  return out.convertToBlob();
};

const trimmedOrSelf = async (blob: Blob): Promise<Blob> => {
  try {
    return await trimmed(blob);
  } catch {
    return blob;
  }
};

export { trimmedOrSelf };
