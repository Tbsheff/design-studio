import { Effect, Result } from "effect";

import {
  applyPlacement,
  attemptKnown,
  BadRequest,
  bundleGallery,
  CANVAS_GAP,
  BadRequestError,
  setForcedState,
} from "./deps.js";
import type {
  CanvasFile,
  CanvasFileFrame,
  PlaceSpec,
  PropValue,
  SampleNode,
} from "./deps.js";
import {
  columnLabels,
  rowLabels,
  sizeOf,
  toCells,
  toGalleryHtml,
} from "./engine/index.js";
import type { GalleryCell, GalleryState } from "./engine/index.js";
import { locate, writeGallery } from "./gallery-files.js";
import type { GalleryManifest } from "./gallery-files.js";
import type { GalleryRuntime } from "./gallery-runtime.js";
import { resolveComponent } from "./gallery-source.js";

type Scheme = "dark" | "light";

interface GalleryCommand {
  readonly component: string;
  readonly directionId: string;
  readonly file: string | null;
  readonly projectId: string;
  readonly props: Record<string, PropValue>;
  readonly schemes: Scheme | "both";
  readonly states: readonly GalleryState[];
}

interface PlacedFrame {
  readonly frameId: string;
  readonly height: number;
  readonly label: string;
  readonly left: number;
  readonly scheme: Scheme;
  readonly top: number;
  readonly width: number;
}

interface GalleryCreated {
  readonly cells: readonly GalleryCell[];
  readonly component: string;
  readonly frames: readonly PlacedFrame[];
  readonly page: string;
}

interface Built {
  readonly cells: readonly GalleryCell[];
  readonly manifest: GalleryManifest;
}

interface Slot {
  readonly label: string;
  readonly left: number;
  readonly scheme: Scheme;
  readonly top: number;
}

const SEED_FRAME: CanvasFileFrame = {
  height: 900,
  id: "f1",
  order: 0,
  width: 1440,
  x: 0,
  y: 0,
};

const ROW_GAP_FACTOR = 2;

const schemesOf = (choice: Scheme | "both"): readonly Scheme[] => {
  if (choice === "both") {
    return ["light", "dark"];
  }

  return [choice];
};

const nodeOf = (
  exportName: string,
  text: string | null,
  cell: GalleryCell
): SampleNode => {
  const children: string[] = [];

  if (text !== null) {
    children.push(text);
  }

  return { children, exportName, props: cell.props };
};

const entryPathOf = (base: string): string => {
  const url = new URL(base);

  return `${url.pathname}${url.search}`;
};

const bundleOf = async (
  request: Parameters<typeof bundleGallery>[0]
): Promise<string> => {
  try {
    return await bundleGallery(request);
  } catch (error) {
    throw new BadRequestError(
      `Could not build ${request.file} for a gallery: ${String(error)}`
    );
  }
};

const buildGallery = async (
  runtime: GalleryRuntime,
  scope: Parameters<typeof resolveComponent>[0],
  direction: Parameters<typeof resolveComponent>[1],
  command: GalleryCommand
): Promise<Built> => {
  const resolved = await resolveComponent(
    scope,
    direction,
    { component: command.component, file: command.file },
    { ...command.props }
  );

  const cells = toCells({
    axes: resolved.axes,
    overrides: resolved.base,
    states: command.states,
  });

  const { entry } = resolved;
  let exportName = entry.name;

  if (entry.kind === "default") {
    exportName = "default";
  }

  const located = Promise.all([
    runtime.preview.directionUrl(scope, direction),
    locate(scope, direction, entry.name),
  ]);

  const bundle = await bundleOf({
    appDir: resolved.appDir,
    cells: cells.map((cell) => ({
      id: cell.id,
      tree: nodeOf(exportName, resolved.text, cell),
    })),
    file: entry.absolute,
    root: resolved.root,
  });

  const [base, place] = await located;
  const columns = columnLabels(cells);
  const rows = rowLabels(cells);

  const entryPath = entryPathOf(base);
  const title = `${entry.name} gallery`;

  const html = toGalleryHtml({
    bundle,
    cells,
    columns,
    entryPath,
    rows,
    title,
  });

  const size = sizeOf(rows.length, columns.length);

  const manifest: GalleryManifest = {
    cells,
    component: entry.name,
    height: size.height,
    page: place.page,
    schemes: schemesOf(command.schemes),
    width: size.width,
  };

  await writeGallery(place, html, manifest);

  return { cells, manifest };
};

const seedFrames = (file: CanvasFile): CanvasFile => {
  if (file.frames.length > 0) {
    return file;
  }

  return { ...file, frames: [SEED_FRAME] };
};

interface Origin {
  readonly left: number;
  readonly top: number;
}

const originOf = (frames: readonly CanvasFileFrame[]): Origin => {
  const shown = frames.filter((frame) => !frame.hidden);

  if (shown.length === 0) {
    return { left: 0, top: 0 };
  }

  const bottom = Math.max(...shown.map((frame) => frame.y + frame.height));
  const left = Math.min(...shown.map((frame) => frame.x));

  return { left, top: bottom + CANVAS_GAP * ROW_GAP_FACTOR };
};

const slotsOf = (
  manifest: GalleryManifest,
  frames: readonly CanvasFileFrame[]
): readonly Slot[] => {
  const origin = originOf(frames);

  return manifest.schemes.map((scheme, at) => {
    const label = `Gallery ${manifest.component} ${scheme}`;
    const left = origin.left + at * (manifest.width + CANVAS_GAP);
    const { top } = origin;

    return { label, left, scheme, top };
  });
};

const toSpec = (
  slot: Slot,
  manifest: GalleryManifest,
  frames: readonly CanvasFileFrame[]
): PlaceSpec => {
  const spec: PlaceSpec = {
    height: manifest.height,
    label: slot.label,
    path: manifest.page,
    width: manifest.width,
    x: slot.left,
    y: slot.top,
  };

  const existing = frames.find((frame) => frame.label === slot.label);

  if (existing) {
    return { ...spec, frame: existing.id };
  }

  return spec;
};

interface Placement {
  readonly file: CanvasFile;
  readonly placed: readonly CanvasFileFrame[];
  readonly slots: readonly Slot[];
}

const placeSlots = (
  file: CanvasFile,
  manifest: GalleryManifest,
  directionId: string
): Placement => {
  const seeded = seedFrames(file);
  const slots = slotsOf(manifest, seeded.frames);
  const specs = slots.map((slot) => toSpec(slot, manifest, seeded.frames));
  const next = applyPlacement(seeded, specs, directionId);

  return { file: next.file, placed: next.placed, slots };
};

const toPlaced = (
  slots: readonly Slot[],
  placed: readonly CanvasFileFrame[],
  manifest: GalleryManifest
): readonly PlacedFrame[] =>
  slots.flatMap((slot, index) => {
    const frame = placed[index];

    if (!frame) {
      return [];
    }

    return [
      {
        frameId: frame.id,
        height: frame.height,
        label: slot.label,
        left: frame.x,
        scheme: slot.scheme,
        top: frame.y,
        width: manifest.width,
      },
    ];
  });

const forceSchemes = (
  owner: string,
  all: readonly CanvasFileFrame[],
  placed: readonly PlacedFrame[]
): void => {
  for (const item of placed) {
    let forced: "dark" | null = null;

    if (item.scheme === "dark") {
      forced = "dark";
    }

    setForcedState({
      frameId: item.frameId,
      frames: all,
      layer: null,
      projectId: owner,
      state: forced,
    });
  }
};

interface Outcome {
  placement: Placement | null;
  refusal: string | null;
}

const messageOf = (cause: unknown): string => {
  if (cause instanceof Error) {
    return cause.message;
  }

  return String(cause);
};

const createGallery = Effect.fn("createGallery")(function* run(
  runtime: GalleryRuntime,
  command: GalleryCommand
) {
  const { direction, project } = yield* attemptKnown(() =>
    runtime.loadDirection(command.projectId, command.directionId)
  );

  const built = yield* attemptKnown(() =>
    buildGallery(runtime, project, direction, command)
  );

  const outcome: Outcome = { placement: null, refusal: null };

  const snapshot = yield* attemptKnown(() =>
    runtime.canvas.update(
      project,
      (file) => {
        const placed = Result.try(() =>
          placeSlots(file, built.manifest, direction.id)
        );

        if (Result.isFailure(placed)) {
          outcome.refusal = messageOf(placed.failure);

          return file;
        }

        outcome.placement = placed.success;

        return placed.success.file;
      },
      { source: "agent" }
    )
  );

  if (outcome.refusal !== null || outcome.placement === null) {
    return yield* new BadRequest({
      message: outcome.refusal ?? "The gallery placement did not run.",
    });
  }

  const frames = toPlaced(
    outcome.placement.slots,
    outcome.placement.placed,
    built.manifest
  );

  forceSchemes(project.id, snapshot.canvas?.frames ?? [], frames);

  const { cells } = built;
  const { component, page } = built.manifest;

  const created: GalleryCreated = { cells, component, frames, page };

  return created;
});

export { createGallery };

export type { GalleryCommand, GalleryCreated, PlacedFrame };
