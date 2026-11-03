import { Effect } from "effect";

import {
  attemptKnown,
  BadRequest,
  NotFound,
  probeOnPage,
  withForcedParam,
  withPagePath,
} from "./deps.js";
import type { KnownFailure } from "./deps.js";
import {
  CONTRAST_LARGE,
  CONTRAST_NORMAL,
  GALLERY_PROBE,
} from "./engine/index.js";
import type { GalleryCell, RawCell, RawGalleryProbe } from "./engine/index.js";
import { locate, readManifest } from "./gallery-files.js";
import type { GalleryManifest } from "./gallery-files.js";
import type { GalleryRuntime } from "./gallery-runtime.js";

type Scheme = "dark" | "light";

interface InspectCommand {
  readonly component: string;
  readonly directionId: string;
  readonly file: string | null;
  readonly projectId: string;
}

interface CellReport {
  readonly cell: GalleryCell;
  readonly contrast: number | null;
  readonly contrastFailure: boolean;
  readonly error: string | null;
  readonly scheme: Scheme;
}

interface GalleryInspected {
  readonly cells: readonly CellReport[];
  readonly component: string;
  readonly failures: number;
  readonly page: string;
}

const urlOf = (base: string, page: string, scheme: Scheme): string => {
  const pageUrl = withPagePath(base, page);

  if (scheme === "dark") {
    return withForcedParam(pageUrl, { selector: null, state: "dark" });
  }

  return pageUrl;
};

const failsContrast = (cell: GalleryCell, raw: RawCell | null): boolean => {
  if (raw === null || raw.contrast === null || cell.state === "disabled") {
    return false;
  }

  if (raw.large) {
    return raw.contrast < CONTRAST_LARGE;
  }

  return raw.contrast < CONTRAST_NORMAL;
};

const toReports = (
  manifest: GalleryManifest,
  scheme: Scheme,
  probe: RawGalleryProbe
): readonly CellReport[] => {
  const byId = new Map(probe.cells.map((raw) => [raw.id, raw]));

  return manifest.cells.map((cell) => {
    const raw = byId.get(cell.id) ?? null;
    const contrast = raw?.contrast ?? null;
    const contrastFailure = failsContrast(cell, raw);
    let error = raw?.error ?? null;

    if (raw === null) {
      error = "The cell was not found on the page.";
    }

    return { cell, contrast, contrastFailure, error, scheme };
  });
};

const probeScheme = (
  runtime: GalleryRuntime,
  base: string,
  manifest: GalleryManifest,
  scheme: Scheme
): Effect.Effect<readonly CellReport[], KnownFailure> =>
  attemptKnown(() =>
    probeOnPage<RawGalleryProbe>(
      runtime.preview,
      urlOf(base, manifest.page, scheme),
      { height: manifest.height, width: manifest.width },
      GALLERY_PROBE
    )
  ).pipe(Effect.map((probe) => toReports(manifest, scheme, probe)));

const inspectGallery = Effect.fn("inspectGallery")(function* run(
  runtime: GalleryRuntime,
  command: InspectCommand
) {
  const { direction, project } = yield* attemptKnown(() =>
    runtime.loadDirection(command.projectId, command.directionId)
  );

  const place = yield* attemptKnown(() =>
    locate(project, direction, command.component)
  );

  const manifest = yield* attemptKnown(() => readManifest(place));

  if (manifest === null) {
    return yield* new NotFound({
      message: `No gallery exists for ${command.component}. Run create_component_gallery first.`,
    });
  }

  if (!runtime.preview.withPage && !runtime.preview.peekPage) {
    return yield* new BadRequest({
      message: "Rendering is not available, so cells cannot be inspected.",
    });
  }

  const base = yield* attemptKnown(() =>
    runtime.preview.directionUrl(project, direction)
  );

  const groups = yield* Effect.all(
    manifest.schemes.map((scheme) =>
      probeScheme(runtime, base, manifest, scheme)
    )
  );

  const cells = groups.flat();

  const inspected: GalleryInspected = {
    cells,
    component: manifest.component,
    failures: cells.filter(
      (report) => report.error !== null || report.contrastFailure
    ).length,
    page: manifest.page,
  };

  return inspected;
});

export { inspectGallery };

export type { CellReport, GalleryInspected, InspectCommand };
