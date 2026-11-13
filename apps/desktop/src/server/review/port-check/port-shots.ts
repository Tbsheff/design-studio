import { Effect } from "effect";

import type {
  PortCheckQuery,
  PortReads,
  PortShotPair,
} from "./port-check-query.js";

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

const toPortShots = Effect.fn("PortMatchStore.toPortShots")(function* run(
  reads: PortReads,
  query: PortCheckQuery
) {
  const base = toShotBase(query);

  const [prototype, app] = yield* Effect.all(
    [
      reads.screenshot({
        ...base,
        directionId: query.directionId,
        path: query.path,
        projectId: query.projectId,
      }),
      reads.screenshot({
        ...base,
        directionId: null,
        path: toUrlRoute(query.routePath),
        projectId: query.targetProjectId,
      }),
    ],
    { concurrency: 2 }
  );

  const pair: PortShotPair = { app: app.data, prototype: prototype.data };

  return pair;
});

export { toPortShots, toUrlRoute };
