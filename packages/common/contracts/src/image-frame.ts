interface ImageSize {
  readonly height: number;
  readonly width: number;
}

const DEVICE_SIZES: readonly ImageSize[] = [
  { height: 844, width: 390 },
  { height: 1024, width: 768 },
  { height: 800, width: 1280 },
  { height: 900, width: 1440 },
];

const DESKTOP_SIZE: ImageSize = { height: 900, width: 1440 };

const MAX_PIXEL_RATIO = 3;

const toDeviceFit = (image: ImageSize): ImageSize => {
  let best = DESKTOP_SIZE;
  let bestGap = Number.POSITIVE_INFINITY;

  for (let ratio = 1; ratio <= MAX_PIXEL_RATIO; ratio += 1) {
    for (const device of DEVICE_SIZES) {
      const gap = Math.abs(image.width / ratio - device.width);

      if (gap < bestGap) {
        best = device;
        bestGap = gap;
      }
    }
  }

  return best;
};

const toImageFrameSize = (image: ImageSize): ImageSize => {
  const device = toDeviceFit(image);
  const height = Math.round((device.width * image.height) / image.width);

  return { height: Math.max(height, device.height), width: device.width };
};

export { toImageFrameSize };

export type { ImageSize };
