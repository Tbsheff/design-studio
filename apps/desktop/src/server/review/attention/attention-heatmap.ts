import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";

import type { AttentionImage } from "./engine/index.js";

const createHeatmapFile = async (
  file: string,
  image: AttentionImage
): Promise<void> => {
  const png = new PNG({ height: image.height, width: image.width });

  png.data = Buffer.from(image.rgba);

  await mkdir(path.dirname(file), { recursive: true });

  const pending = `${file}.${process.pid}.tmp`;

  await writeFile(pending, PNG.sync.write(png));
  await rename(pending, file);
};

const toHeatmapPath = (
  projectDir: string,
  key: { readonly directionId: string; readonly frameId: string }
): string =>
  path.join(
    projectDir,
    "checks",
    "attention",
    `${key.directionId}-${key.frameId}.png`
  );

export { createHeatmapFile, toHeatmapPath };
