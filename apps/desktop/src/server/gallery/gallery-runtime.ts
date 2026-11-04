import type { Effect } from "effect";

import { makeRuntimeSlot } from "./deps.js";
import type {
  CanvasService,
  DirectEditDeps,
  Direction,
  PreviewService,
  Project,
} from "./deps.js";

interface GalleryRuntime {
  readonly canvas: CanvasService;
  readonly editDeps: DirectEditDeps;
  readonly loadDirection: (
    projectId: string,
    directionId: string
  ) => Promise<{ direction: Direction; project: Project }>;
  readonly preview: PreviewService;
}

const runtimes = makeRuntimeSlot<GalleryRuntime>("Gallery");

const bindGalleryRuntime = (runtime: GalleryRuntime): void => {
  runtimes.bind(runtime);
};

const galleryRuntime: Effect.Effect<GalleryRuntime> = runtimes.read;

export { bindGalleryRuntime, galleryRuntime };

export type { GalleryRuntime };
