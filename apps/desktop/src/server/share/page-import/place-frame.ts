import { readFile } from "node:fs/promises";

import { applyPlacement, CANVAS_VIEWPORTS, canvasPath } from "./deps.js";
import type {
  CanvasFile,
  CanvasFileFrame,
  CanvasService,
  Direction,
  Project,
} from "./deps.js";
import { PageImportError } from "./errors.js";
import { quietly } from "./quiet.js";

type PlaceSource = "agent" | "run";

interface FramePlacement {
  readonly frame: CanvasFileFrame;
  readonly before: string | null;
  readonly after: string | null;
}

interface FrameSpec {
  readonly page: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

const toReadCanvasText = (direction: Direction): Promise<string | null> =>
  quietly(readFile(canvasPath(direction.workTree), "utf-8"));

const toWithEntryFrame = (
  file: CanvasFile,
  target: { readonly project: Project; readonly direction: Direction },
  page: string
): CanvasFile => {
  if (file.frames.length > 0 || page === target.project.entry) {
    return file;
  }

  return applyPlacement(
    file,
    [{ ...CANVAS_VIEWPORTS.desktop }],
    target.direction.id
  ).file;
};

const toPlaceFrame = async (
  canvas: CanvasService,
  target: { readonly project: Project; readonly direction: Direction },
  spec: FrameSpec,
  source: PlaceSource
): Promise<FramePlacement> => {
  const before = await toReadCanvasText(target.direction);
  let placed: CanvasFileFrame | null = null;

  await canvas.update(
    target.project,
    (file) => {
      const next = applyPlacement(
        toWithEntryFrame(file, target, spec.page),
        [
          {
            height: spec.height,
            label: spec.label,
            path: spec.page,
            width: spec.width,
          },
        ],
        target.direction.id
      );

      placed = next.placed[0] ?? null;

      return next.file;
    },
    { source }
  );

  const frame: CanvasFileFrame | null = placed;

  if (frame === null) {
    throw new PageImportError("The canvas frame was not added.");
  }

  return { after: await toReadCanvasText(target.direction), before, frame };
};

export { toPlaceFrame as placeFrame };

export type { FramePlacement, FrameSpec, PlaceSource };
