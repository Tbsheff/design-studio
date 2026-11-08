import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Effect } from "effect";

import type { McpReadStore } from "../../preview/index.js";
import { isBlankShot, toRouteDiff } from "./impact-diff.js";
import { getImpactRecord, setImpactRecord } from "./impact-memory.js";
import type {
  ImpactBaseline,
  ImpactBaselineRoute,
  ImpactGetQuery,
  ImpactResult,
  ImpactRoute,
  ImpactRunQuery,
} from "./impact-types.js";

type Reads = Pick<typeof McpReadStore.Service, "screenshot" | "usage">;

const SHOT_WIDTH = 1280;

const SHOT_HEIGHT = 800;

const DYNAMIC_ROUTE = /[:[*]/u;

const BLANK_NOTE = "The page is blank. It may need a sign-in.";

const DYNAMIC_NOTE = "A dynamic route has no sample page to shoot.";

interface Shot {
  readonly note: string | null;
  readonly png: string | null;
}

const toSameFile = (left: string, right: string): boolean => {
  const first = left.trim().replace(/^\/+/u, "");
  const second = right.trim().replace(/^\/+/u, "");

  return (
    first === second ||
    first.endsWith(`/${second}`) ||
    second.endsWith(`/${first}`)
  );
};

const toShot = (
  reads: Reads,
  query: ImpactGetQuery,
  route: string
): Effect.Effect<Shot> => {
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
      onFailure: (error): Shot => ({ note: error.message, png: null }),
      onSuccess: (view): Shot => {
        if (isBlankShot(view.data)) {
          return { note: BLANK_NOTE, png: null };
        }

        return { note: null, png: view.data };
      },
    }
  );
};

const toRoutes = Effect.fn("impact.toRoutes")(function* run(
  reads: Reads,
  query: ImpactGetQuery,
  routes: readonly { readonly file: string; readonly route: string }[]
) {
  return yield* Effect.all(
    routes.map((item) =>
      Effect.map(
        toShot(reads, query, item.route),
        (shot): ImpactBaselineRoute => ({
          file: item.file,
          note: shot.note,
          png: shot.png,
          route: item.route,
        })
      )
    )
  );
});

const toRouteDepth = (route: string): number =>
  route.split("/").filter((part) => part !== "").length;

const toRouteOrder = (
  left: { readonly route: string },
  right: { readonly route: string }
): number =>
  toRouteDepth(left.route) - toRouteDepth(right.route) ||
  left.route.localeCompare(right.route);

const toBaselineRoute = (item: ImpactBaselineRoute): ImpactRoute => {
  if (item.png === null) {
    return {
      after: null,
      before: null,
      changedPct: null,
      diff: null,
      file: item.file,
      note: item.note,
      route: item.route,
      status: "failed",
    };
  }

  const same = toRouteDiff(item.png, item.png);

  return {
    after: null,
    before: same.before,
    changedPct: null,
    diff: null,
    file: item.file,
    note: null,
    route: item.route,
    status: "saved",
  };
};

const runBaseline = Effect.fn("impact.runBaseline")(function* run(
  reads: Reads,
  query: ImpactRunQuery
) {
  const usage = yield* reads.usage({
    directionId: query.directionId,
    file: query.file,
    projectId: query.projectId,
    route: null,
    usedAt: null,
  });

  const shots = yield* toRoutes(
    reads,
    query,
    usage.routes.toSorted(toRouteOrder).slice(0, query.limit)
  );

  const baseline: ImpactBaseline = {
    component: usage.component,
    file: usage.file,
    routes: shots.map((item) => ({
      file: item.file,
      note: item.note,
      png: item.png,
      route: item.route,
    })),
  };

  const last: ImpactResult = {
    component: usage.component,
    file: usage.file,
    hasBaseline: true,
    phase: "baseline",
    routes: shots.map((item) => toBaselineRoute(item)),
  };

  setImpactRecord(query, { baseline, last });

  return last;
});

const toCompareRoute = (
  baseline: ImpactBaselineRoute,
  shot: Shot
): ImpactRoute => {
  if (baseline.png === null || shot.png === null) {
    return {
      after: null,
      before: null,
      changedPct: null,
      diff: null,
      file: baseline.file,
      note:
        shot.note ??
        baseline.note ??
        "The baseline shot failed for this route.",
      route: baseline.route,
      status: "failed",
    };
  }

  const found = toRouteDiff(baseline.png, shot.png);
  let status: ImpactRoute["status"] = "same";

  if (found.changedPct > 0) {
    status = "changed";
  }

  return {
    after: found.after,
    before: found.before,
    changedPct: found.changedPct,
    diff: found.diff,
    file: baseline.file,
    note: null,
    route: baseline.route,
    status,
  };
};

const runCompare = Effect.fn("impact.runCompare")(function* run(
  reads: Reads,
  query: ImpactRunQuery
) {
  const baseline = getImpactRecord(query)?.baseline ?? null;

  if (baseline === null || !toSameFile(baseline.file, query.file)) {
    return yield* new BadRequest({
      message: `Run run_impact with phase baseline on ${query.file} before the edit, then compare.`,
    });
  }

  const kept = baseline.routes.slice(0, query.limit);

  const shots = yield* toRoutes(
    reads,
    query,
    kept.map((item) => ({ file: item.file, route: item.route }))
  );

  const last: ImpactResult = {
    component: baseline.component,
    file: baseline.file,
    hasBaseline: true,
    phase: "compare",
    routes: kept.map((item, index) =>
      toCompareRoute(item, shots[index] ?? { note: null, png: null })
    ),
  };

  setImpactRecord(query, { baseline, last });

  return last;
});

const runImpactPhase = (
  reads: Reads,
  query: ImpactRunQuery
): ReturnType<typeof runBaseline> | ReturnType<typeof runCompare> => {
  if (query.phase === "baseline") {
    return runBaseline(reads, query);
  }

  return runCompare(reads, query);
};

export { runImpactPhase };

export type { Reads as ImpactReads };
