interface DrawFrame {
  width: number;
  height: number;
}

const MAX_BACKING_SIDE = 8192;
const MAX_BACKING_AREA = 24_000_000;

const backingScale = (frame: DrawFrame, zoom: number): number => {
  const dpr = globalThis.devicePixelRatio || 1;

  return Math.min(
    dpr * zoom,
    MAX_BACKING_SIDE / Math.max(frame.width, frame.height),
    Math.sqrt(MAX_BACKING_AREA / (frame.width * frame.height))
  );
};

export { backingScale };

export type { DrawFrame };
