interface RawCell {
  readonly contrast: number | null;
  readonly error: string | null;
  readonly id: string;
  readonly large: boolean;
}

interface RawGalleryProbe {
  readonly cells: readonly RawCell[];
}

const CONTRAST_NORMAL = 4.5;

const CONTRAST_LARGE = 3;

export { CONTRAST_LARGE, CONTRAST_NORMAL };

export { GALLERY_PROBE } from "./probe.probe.js";

export type { RawCell, RawGalleryProbe };
