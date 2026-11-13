import type { LinksFile } from "@design-studio/contracts/links";
import {
  toStartName,
  toStartNameKey,
  toStartPoints,
  withFirstStart,
  withStartPoints,
} from "@design-studio/contracts/start-points";
import type { StartPoint } from "@design-studio/contracts/start-points";

import { toWritableContext } from "./link-ops.js";
import type { LinkRuntime } from "./link-runtime.js";
import { LinkError, frameOf, framesOf } from "./link-tools.js";

interface StartPointsQuery {
  readonly projectId: string;
  readonly starts: readonly StartPoint[];
}

type CanvasFrames = Awaited<ReturnType<typeof framesOf>>;

const SOURCE = "user";

const toNamedPoint = (frames: CanvasFrames, point: StartPoint): StartPoint => {
  const name = toStartName(point.name);

  if (name === null) {
    throw new LinkError("Give each start point a name.");
  }

  return { frame: frameOf(frames, point.frame).id, name };
};

const toCheckedPoints = (
  frames: CanvasFrames,
  points: readonly StartPoint[]
): StartPoint[] => {
  const names = new Set<string>();

  return points.map((point) => {
    const named = toNamedPoint(frames, point);
    const key = toStartNameKey(named.name);

    if (names.has(key)) {
      throw new LinkError(
        `Two start points are named ${named.name}. Use a different name for each.`
      );
    }

    names.add(key);

    return named;
  });
};

const setStartList = async (
  runtime: LinkRuntime,
  query: StartPointsQuery
): Promise<readonly StartPoint[]> => {
  const context = await toWritableContext(runtime, query.projectId);
  const points = toCheckedPoints(await framesOf(context), query.starts);

  const saved = await runtime.canvas.links.update(
    context.project,
    (file): LinksFile => withStartPoints(file, points),
    SOURCE
  );

  return toStartPoints(saved);
};

const setFirstStart = async (
  runtime: LinkRuntime,
  projectId: string,
  frameRef: string
): Promise<LinksFile> => {
  const context = await toWritableContext(runtime, projectId);
  const frame = frameOf(await framesOf(context), frameRef);

  return runtime.canvas.links.update(
    context.project,
    (file): LinksFile => withFirstStart(file, frame.id),
    SOURCE
  );
};

export { setFirstStart, setStartList };

export type { StartPointsQuery };
