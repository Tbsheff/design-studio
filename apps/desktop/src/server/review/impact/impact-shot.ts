import { Effect } from "effect";

import type { McpReadStore } from "../../preview/index.js";
import { isBlankShot, toChangedPct } from "./impact-diff.js";
import type { ImpactGetQuery } from "./impact-types.js";

type ImpactReads = Pick<typeof McpReadStore.Service, "screenshot" | "usage">;

interface ImpactShot {
  readonly note: string | null;
  readonly png: string | null;
}

const SHOT_WIDTH = 1280;

const SHOT_HEIGHT = 800;

const COMPARE_SHOTS = 3;

const DYNAMIC_ROUTE = /[:[*]/u;

const BLANK_NOTE = "The page is blank. It may need a sign-in.";

const DYNAMIC_NOTE = "A dynamic route has no sample page to shoot.";

const toShot = (
  reads: ImpactReads,
  query: ImpactGetQuery,
  route: string
): Effect.Effect<ImpactShot> => {
  if (DYNAMIC_ROUTE.test(route)) {
    return Effect.succeed({ note: DYNAMIC_NOTE, png: null });
  }

  return Effect.match(
    reads.screenshot({
      directionId: query.directionId,
      element: null,
      frameId: null,
      height: SHOT_HEIGHT,
      isFullPage: true,
      padding: null,
      path: route,
      projectId: query.projectId,
      versionId: null,
      width: SHOT_WIDTH,
    }),
    {
      onFailure: (error): ImpactShot => ({ note: error.message, png: null }),
      onSuccess: (view): ImpactShot => {
        if (isBlankShot(view.data)) {
          return { note: BLANK_NOTE, png: null };
        }

        return { note: null, png: view.data };
      },
    }
  );
};

const toSettledShot = Effect.fn("impact.toSettledShot")(function* run(
  reads: ImpactReads,
  query: ImpactGetQuery,
  route: string
) {
  const first = yield* toShot(reads, query, route);
  const second = yield* toShot(reads, query, route);

  if (first.png === null || second.png === null) {
    return second;
  }

  if (toChangedPct(first.png, second.png) === 0) {
    return second;
  }

  return yield* toShot(reads, query, route);
});

const toRetriedShot = Effect.fn("impact.toRetriedShot")(function* run(
  reads: ImpactReads,
  query: ImpactGetQuery,
  route: string,
  baseline: string | null
) {
  let best = yield* toShot(reads, query, route);

  if (baseline === null || best.png === null) {
    return best;
  }

  let bestPct = toChangedPct(baseline, best.png);

  for (let attempt = 1; attempt < COMPARE_SHOTS && bestPct > 0; attempt += 1) {
    const next = yield* toShot(reads, query, route);

    if (next.png !== null) {
      const nextPct = toChangedPct(baseline, next.png);

      if (nextPct < bestPct) {
        best = next;
        bestPct = nextPct;
      }
    }
  }

  return best;
});

export { toRetriedShot, toSettledShot };

export type { ImpactReads, ImpactShot };
