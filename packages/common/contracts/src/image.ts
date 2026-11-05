const IMAGE_FITS = ["cover", "contain", "fill"] as const;

const IMAGE_MODES = ["auto", "img", "background", "insert"] as const;

const IMAGE_ALT_MAX = 500;

type ImageFit = (typeof IMAGE_FITS)[number];

type ImageMode = (typeof IMAGE_MODES)[number];

export { IMAGE_ALT_MAX, IMAGE_FITS, IMAGE_MODES };

export type { ImageFit, ImageMode };
