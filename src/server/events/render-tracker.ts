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
  readonly isPending: (projectId: string | null) => Effect.Effect<boolean>;
  readonly notePage: (projectId: string, page: string) => Effect.Effect<void>;
  readonly pages: (projectId: string) => Effect.Effect<readonly string[]>;
  readonly projectOf: (url: string) => Effect.Effect<string | null>;
  readonly renderedSince: (
    projectId: string,
    since: number
  ) => Effect.Effect<boolean>;
  readonly settled: (projectId: string | null) => Effect.Effect<boolean>;
  readonly settledFor: (url: string) => Effect.Effect<boolean>;
  readonly start: (projectId: string, render: Render) => Effect.Effect<void>;
}

const isPendingFor = (projectId: string | null): boolean => {
  if (projectId === null) {
    return renderPending();
  }

  return renderPending(projectId);
};

const isSettledFor = (projectId: string | null): Promise<boolean> => {
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
      isPending: Effect.fn("RenderTracker.isPending")(function* run(
        projectId: string | null
      ) {
        return yield* Effect.sync(() => isPendingFor(projectId));
      }),
      notePage: Effect.fn("RenderTracker.notePage")(function* run(
        projectId: string,
        page: string
      ) {
        yield* Effect.sync(() => noteRenderedPage(projectId, page));
      }),
      pages: Effect.fn("RenderTracker.pages")(function* run(projectId: string) {
        return yield* Effect.sync(() => recentPages(projectId));
      }),
      projectOf: Effect.fn("RenderTracker.projectOf")(function* run(
        url: string
      ) {
        return yield* Effect.sync(() => projectOfUrl(url));
      }),
      renderedSince: Effect.fn("RenderTracker.renderedSince")(function* run(
        projectId: string,
        since: number
      ) {
        return yield* Effect.sync(() => renderedAfter(projectId, since));
      }),
      settled: Effect.fn("RenderTracker.settled")(function* run(
        projectId: string | null
      ) {
        return yield* Effect.promise(() => isSettledFor(projectId));
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
