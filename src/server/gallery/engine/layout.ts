const LABEL_WIDTH = 140;

const CELL_WIDTH = 220;

const CELL_HEIGHT = 100;

const HEAD_HEIGHT = 56;

const PAGE_PADDING = 24;

const PAIR_GAP = 2;

interface GallerySize {
  readonly height: number;
  readonly width: number;
}

const sizeOf = (rows: number, columns: number): GallerySize => ({
  height: PAGE_PADDING * PAIR_GAP + HEAD_HEIGHT + rows * CELL_HEIGHT,
  width: PAGE_PADDING * PAIR_GAP + LABEL_WIDTH + columns * CELL_WIDTH,
});

export {
  CELL_HEIGHT,
  CELL_WIDTH,
  HEAD_HEIGHT,
  LABEL_WIDTH,
  PAGE_PADDING,
  sizeOf,
};

export type { GallerySize };
