import type { Effect } from "effect";

import { toPreviewOrigin, runDirectionWrite } from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import type {
  ImageSearchRequest,
  ImageSearchResult,
  PlaceImageInput,
  PlaceImageResult,
  Project,
  SourceLoc,
} from "./deps.js";
import { toImageSearchFailure } from "./image-search-failure.js";
import { toPhotoFill } from "./photo-fill.js";
import type { PhotoFillResult } from "./photo-fill.js";
import { placeImage } from "./place.js";
import { searchImages } from "./search.js";
import type { PlaceTarget } from "./target.js";

interface ImageOwner {
  readonly name: string;
  readonly stack: string;
}

interface ImagePlaceTarget {
  readonly background: boolean | null;
  readonly html: string | null;
  readonly owners: readonly ImageOwner[] | null;
  readonly selector: string | null;
  readonly source: SourceLoc | null;
  readonly tag: string;
}

interface InsertImageSearchCommand extends DirectionIds, PlaceImageInput {
  readonly target: ImagePlaceTarget;
}

const toPlaceTarget = (target: ImagePlaceTarget): PlaceTarget => {
  const out: PlaceTarget = { source: target.source, tag: target.tag };

  if (target.background !== null) {
    out.background = target.background;
  }

  if (target.html !== null) {
    out.html = target.html;
  }

  if (target.owners !== null) {
    out.owners = target.owners.map((owner) => ({ ...owner }));
  }

  if (target.selector !== null) {
    out.selector = target.selector;
  }

  return out;
};

const runImageSearch = (
  project: Project,
  request: ImageSearchRequest
): Effect.Effect<ImageSearchResult, KnownFailure> =>
  attemptKnown(() => searchImages(project, request), toImageSearchFailure);

const runImagePlace = (
  command: InsertImageSearchCommand
): Effect.Effect<PlaceImageResult, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<PlaceImageResult> => {
      const previewOrigin = await toPreviewOrigin(
        runtime.preview,
        project,
        direction
      );

      const done = await placeImage(
        runtime.editDeps,
        { direction, previewOrigin, project, workTree: direction.workTree },
        {
          alt: command.alt,
          fit: command.fit,
          focal: command.focal,
          imageId: command.imageId,
          mode: command.mode,
          position: command.position,
        },
        toPlaceTarget(command.target)
      );

      return done.result;
    },
    toImageSearchFailure
  );

interface ApplyImageSearchCommand extends DirectionIds {
  readonly path: string;
  readonly slots: readonly string[] | null;
}

const runPhotoFill = (
  command: ApplyImageSearchCommand
): Effect.Effect<PhotoFillResult, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<PhotoFillResult> =>
      await toPhotoFill(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        { path: command.path, slots: command.slots }
      ),
    toImageSearchFailure
  );

export { runImagePlace, runImageSearch, runPhotoFill };

export type {
  ApplyImageSearchCommand,
  ImageOwner,
  ImagePlaceTarget,
  InsertImageSearchCommand,
};
