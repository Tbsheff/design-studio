import { Effect, Result } from "effect";

import type {
  PortCheckQuery,
  PortReads,
  PortShot,
  PortShotPair,
} from "./port-check-query.js";
import { EMPTY_PROBE, decodeProbe, toMaskProbe } from "./port-mask-probe.js";
import type { MaskProbe, MaskProbeInput } from "./port-mask-probe.js";

const SHOT_HEIGHT = 1600;

const GROUP_SEGMENT = /^\(.*\)$/u;

const toUrlRoute = (routePath: string): string => {
  const segments = routePath
    .split("/")
    .filter((segment) => segment !== "" && !GROUP_SEGMENT.test(segment));

  return `/${segments.join("/")}`;
};

interface PortShotBase {
  readonly colorScheme: null;
  readonly element: null;
  readonly frameId: null;
  readonly height: number;
  readonly isFullPage: boolean;
  readonly padding: null;
  readonly versionId: null;
  readonly width: number;
}

interface PortShotTarget {
  readonly directionId: string | null;
  readonly path: string;
  readonly projectId: string;
}

const toShotBase = (query: PortCheckQuery): PortShotBase => ({
  colorScheme: null,
  element: null,
  frameId: null,
  height: SHOT_HEIGHT,
  isFullPage: false,
  padding: null,
  versionId: null,
  width: query.width,
});

const toProbe = (text: string | null): MaskProbe => {
  if (text === null) {
    return EMPTY_PROBE;
  }

  const decoded = decodeProbe(text);

  if (Result.isFailure(decoded)) {
    return EMPTY_PROBE;
  }

  return decoded.success;
};

const toPortShot = Effect.fn("PortMatchStore.toPortShot")(function* run(
  reads: PortReads,
  query: PortCheckQuery,
  target: PortShotTarget,
  input: MaskProbeInput
) {
  const found = yield* reads.probedScreenshot(
    { ...toShotBase(query), ...target },
    toMaskProbe(input)
  );

  const shot: PortShot = {
    data: found.view.data,
    probe: toProbe(found.probe),
  };

  return shot;
});

const toRowLimits = (pair: PortShotPair): number[] => {
  const app = pair.app.probe.rowCounts;
  const prototype = pair.prototype.probe.rowCounts;

  return app.map((count, index) => Math.min(count, prototype[index] ?? count));
};

const isOverLimit = (shot: PortShot, limits: readonly number[]): boolean =>
  shot.probe.rowCounts.some((count, index) => count > (limits[index] ?? count));

const toLimitedShot = <Failure>(
  shot: PortShot,
  limits: readonly number[],
  reshoot: () => Effect.Effect<PortShot, Failure>
): Effect.Effect<PortShot, Failure> => {
  if (isOverLimit(shot, limits)) {
    return reshoot();
  }

  return Effect.succeed(shot);
};

const toPortShots = Effect.fn("PortMatchStore.toPortShots")(function* run(
  reads: PortReads,
  query: PortCheckQuery,
  keptTexts: readonly string[]
) {
  const prototypeTarget: PortShotTarget = {
    directionId: query.directionId,
    path: query.path,
    projectId: query.projectId,
  };

  const appTarget: PortShotTarget = {
    directionId: null,
    path: toUrlRoute(query.routePath),
    projectId: query.targetProjectId,
  };

  const [prototype, app] = yield* Effect.all(
    [
      toPortShot(reads, query, prototypeTarget, {
        hide: [],
        isSourced: false,
        rowLimits: null,
      }),
      toPortShot(reads, query, appTarget, {
        hide: keptTexts,
        isSourced: query.isSourced,
        rowLimits: null,
      }),
    ],
    { concurrency: 2 }
  );

  const pair: PortShotPair = { app, prototype };

  if (query.update === null) {
    return pair;
  }

  const rowLimits = toRowLimits(pair);

  const [prototypeLimited, appLimited] = yield* Effect.all(
    [
      toLimitedShot(prototype, rowLimits, () =>
        toPortShot(reads, query, prototypeTarget, {
          hide: [],
          isSourced: false,
          rowLimits,
        })
      ),
      toLimitedShot(app, rowLimits, () =>
        toPortShot(reads, query, appTarget, {
          hide: keptTexts,
          isSourced: query.isSourced,
          rowLimits,
        })
      ),
    ],
    { concurrency: 2 }
  );

  const limited: PortShotPair = {
    app: appLimited,
    prototype: prototypeLimited,
  };

  return limited;
});

export { SHOT_HEIGHT, toPortShots, toUrlRoute };
