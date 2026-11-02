import { Context, Effect, Layer } from "effect";

import {
  noteRenderedPage,
  projectOfUrl,
  recentPages,
  renderPending,
  renderSettled,
  renderSettledFor,
  renderedSince as renderedAfter,
  startRender,
} from "./render-wait.js";

type Render = (signal: AbortSignal) => Promise<void>;

interface RenderTrackerApi {
  readonly isPending: (projectId: string | null) => boolean;
  readonly notePage: (projectId: string, page: string) => Effect.Effect<void>;
  readonly pages: (projectId: string) => readonly string[];
  readonly projectOf: (url: string) => string | null;
  readonly renderedSince: (projectId: string, since: number) => boolean;
  readonly settled: (projectId: string | null) => Effect.Effect<boolean>;
  readonly settledFor: (url: string) => Effect.Effect<boolean>;
  readonly start: (projectId: string, render: Render) => Effect.Effect<void>;
}

const pendingFor = (projectId: string | null): boolean => {
  if (projectId === null) {
    return renderPending();
  }

  return renderPending(projectId);
};

const settledFor = (projectId: string | null): Promise<boolean> => {
  if (projectId === null) {
    return renderSettled();
  }

  return renderSettled(projectId);
};

class RenderTracker extends Context.Service<RenderTracker, RenderTrackerApi>()(
  "design-studio/events/RenderTracker"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    RenderTracker,
    RenderTracker.of({
      isPending: pendingFor,
      notePage: Effect.fn("RenderTracker.notePage")(function* run(
        projectId: string,
        page: string
      ) {
        yield* Effect.sync(() => noteRenderedPage(projectId, page));
      }),
      pages: recentPages,
      projectOf: projectOfUrl,
      renderedSince: renderedAfter,
      settled: Effect.fn("RenderTracker.settled")(function* run(
        projectId: string | null
      ) {
        return yield* Effect.promise(() => settledFor(projectId));
      }),
      settledFor: Effect.fn("RenderTracker.settledFor")(function* run(
        url: string
      ) {
        return yield* Effect.promise(() => renderSettledFor(url));
      }),
      start: Effect.fn("RenderTracker.start")(function* run(
        projectId: string,
        render: Render
      ) {
        yield* Effect.sync(() => startRender(projectId, render));
      }),
    })
  );
}

export { RenderTracker };

export type { RenderTrackerApi };
