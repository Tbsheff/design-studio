import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";

import { BadRequestError, NotFoundError } from "./deps.js";
import { toPalette } from "./engine/index.js";
import type { PaletteSwatch } from "./engine/index.js";

const IMAGE_BYTES_MAX = 25_165_824;

const PIXELS_MAX = 40_000_000;

const PNG_SIGNATURE = "89504e470d0a1a0a";

const SIGNATURE_BYTES = 8;

const IHDR_WIDTH_OFFSET = 16;

const IHDR_HEIGHT_OFFSET = 20;

const NOT_PNG =
  "Only PNG images can be read. Export the image as PNG and try again.";

const toFileSize = async (imagePath: string): Promise<number> => {
  try {
    const found = await stat(imagePath);

    return found.size;
  } catch {
    throw new NotFoundError(`No image file exists at ${imagePath}.`);
  }
};

const toBytes = async (imagePath: string): Promise<Buffer> => {
  if (!path.isAbsolute(imagePath)) {
    throw new BadRequestError(
      "imagePath must be an absolute path, or the path of a project attachment."
    );
  }

  const size = await toFileSize(imagePath);

  if (size > IMAGE_BYTES_MAX) {
    throw new BadRequestError("The image file is larger than 24 MB.");
  }

  return readFile(imagePath);
};

const IHDR_END = 24;

const isPng = (bytes: Buffer): boolean =>
  bytes.length >= IHDR_END &&
  bytes.toString("hex", 0, SIGNATURE_BYTES) === PNG_SIGNATURE;

const toImagePalette = async (imagePath: string): Promise<PaletteSwatch[]> => {
  const bytes = await toBytes(imagePath);

  if (!isPng(bytes)) {
    throw new BadRequestError(NOT_PNG);
  }

  const width = bytes.readUInt32BE(IHDR_WIDTH_OFFSET);
  const height = bytes.readUInt32BE(IHDR_HEIGHT_OFFSET);

  if (width * height > PIXELS_MAX) {
    throw new BadRequestError("The image is larger than 40 million pixels.");
  }

  let colors: PaletteSwatch[] = [];

  try {
    colors = toPalette(PNG.sync.read(bytes));
  } catch {
    throw new BadRequestError("The PNG file cannot be decoded.");
  }

  if (colors.length === 0) {
    throw new BadRequestError("The image has no visible pixels.");
  }

  return colors;
};

export { toImagePalette };
