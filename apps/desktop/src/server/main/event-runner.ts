import { listProject } from "@design-studio/actions/project/list";
import { Effect } from "effect";

import { EventQueue } from "../events/index.js";
import type { EventRunner } from "../events/index.js";
import type { StudioRuntime } from "./runtime.js";

const eventRunner: EventRunner = {
  toPromise: (program) => Effect.runPromise(program),
};

const toThumbnailNotice =
  (runtime: StudioRuntime) =>
  (projectId: string): void => {
    runtime.runFork(
      Effect.gen(function* announceThumbnail() {
        const bus = yield* EventQueue;

        yield* bus.announce({
          actionId: listProject.id,
          invalidates: [listProject.id],
          projectId,
        });
      })
    );
  };

export { eventRunner, toThumbnailNotice };
