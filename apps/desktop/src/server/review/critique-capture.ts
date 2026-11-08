import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { scanLayers, toProbeTarget } from "../page-probe/index.js";
import type { Layer } from "../page-probe/index.js";
import type { PreviewService } from "../preview/index.js";
import type { CritiqueShot } from "./critique-model.js";

interface FrameCapture {
  readonly layers: readonly Layer[];
  readonly shots: readonly CritiqueShot[];
}

interface CaptureTarget {
  readonly height: number;
  readonly label: string;
  readonly page: string | undefined;
  readonly scope: string;
  readonly url: string;
  readonly width: number;
}

const MAX_TILES = 2;

const SCAN_DEPTH = 4;

const SCAN_MAX = 60;

const createShots = async (
  preview: PreviewService,
  target: CaptureTarget
): Promise<CritiqueShot[]> => {
  const folder = await mkdtemp(path.join(os.tmpdir(), "ds-critique-"));

  try {
    const tiles = await preview.screenshotTiles(target.url, {
      from: 0,
      maxTiles: MAX_TILES,
      outPrefix: path.join(folder, "tile"),
      tileHeight: target.height,
      viewport: { height: target.height, width: target.width },
    });

    return await Promise.all(
      tiles.paths.map(async (file, index) => {
        const bytes = await readFile(file);
        const label = `${target.label}, ${target.width} px wide, image ${index + 1} of ${tiles.paths.length}`;

        return { base64: bytes.toString("base64"), label };
      })
    );
  } finally {
    await rm(folder, { force: true, recursive: true });
  }
};

const createFrameCapture = async (
  preview: PreviewService,
  target: CaptureTarget
): Promise<FrameCapture> => {
  const viewport = { height: target.height, width: target.width };

  const [shots, scanned] = await Promise.all([
    createShots(preview, target),
    scanLayers(
      toProbeTarget(preview, target.url, viewport, target.scope),
      target.page,
      {
        depth: SCAN_DEPTH,
        max: SCAN_MAX,
        root: null,
      }
    ),
  ]);

  return { layers: scanned?.layers ?? [], shots };
};

export { createFrameCapture };

export type { CaptureTarget, FrameCapture };
