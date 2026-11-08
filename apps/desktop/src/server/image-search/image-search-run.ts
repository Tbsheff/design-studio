import type { Effect } from "effect";

import { toPreviewOrigin, runDirectionWrite } from "../direct-edit/index.js";
import type { DirectionIds } from "../direct-edit/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import type {
  ImageSearchRequest,
  ImageSearchResult,
  PlaceImageInput,
  PlaceImageResult,
  Project,
  SourceLoc,
} from "./deps.js";
import { toImageSearchFailure } from "./image-search-failure.js";
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

export { runImagePlace, runImageSearch };

export type { ImageOwner, ImagePlaceTarget, InsertImageSearchCommand };
