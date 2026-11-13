interface LinkedFrameBox {
  readonly height: number;
  readonly hidden?: boolean;
  readonly id: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface LinkedFrameSpot {
  readonly neighborId: string;
  readonly x: number;
  readonly y: number;
}

const LINKED_FRAME_GAP = 160;

const isInRow = (frame: LinkedFrameBox, source: LinkedFrameBox): boolean =>
  frame.hidden !== true &&
  frame.x >= source.x &&
  frame.y < source.y + source.height &&
  frame.y + frame.height > source.y;

const toRightEdge = (frame: LinkedFrameBox): number => frame.x + frame.width;

const toLinkedNeighbor = (
  frames: readonly LinkedFrameBox[],
  source: LinkedFrameBox
): LinkedFrameBox => {
  let best = source;

  for (const frame of frames) {
    if (isInRow(frame, source) && toRightEdge(frame) > toRightEdge(best)) {
      best = frame;
    }
  }

  return best;
};

const toLinkedSpot = (
  frames: readonly LinkedFrameBox[],
  source: LinkedFrameBox
): LinkedFrameSpot => {
  const neighbor = toLinkedNeighbor(frames, source);

  return {
    neighborId: neighbor.id,
    x: neighbor.x + neighbor.width + LINKED_FRAME_GAP,
    y: neighbor.y,
  };
};

export { LINKED_FRAME_GAP, toLinkedSpot };

export type { LinkedFrameBox, LinkedFrameSpot };
