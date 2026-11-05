import type { Effect } from "effect";

import {
  previewOriginOf,
  runDirectionRead,
  runDirectionWrite,
} from "../direct-edit/index.js";
import type { DirectionIds } from "../direct-edit/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { applyIconInsert } from "./apply.js";
import type { IconInsertResult } from "./apply.js";
import type {
  IconList,
  IconPosition,
  IconSource,
  InsertTarget,
  SourceLoc,
} from "./deps.js";
import { toIconFailure } from "./icon-failure.js";
import type { IconInsertRequest } from "./insert.js";
import { listIcons } from "./list.js";

interface InspectIconCommand extends DirectionIds {
  readonly library: IconSource | null;
  readonly limit: number;
  readonly query: string;
}

interface IconOwner {
  readonly name: string;
  readonly stack: string;
}

interface IconTarget {
  readonly owners: readonly IconOwner[] | null;
  readonly selector: string | null;
  readonly source: SourceLoc | null;
  readonly tag: string | null;
}

interface InsertIconCommand extends DirectionIds {
  readonly color: string | null;
  readonly library: IconSource | null;
  readonly name: string;
  readonly position: IconPosition;
  readonly size: number;
  readonly target: IconTarget;
}

interface IconInserted {
  readonly at: string | null;
  readonly file: string;
  readonly icon: string;
  readonly importAdded: boolean;
  readonly importFrom: string | null;
  readonly library: IconSource;
  readonly markup: string;
  readonly select: IconInsertResult["plan"]["select"];
  readonly swapped: boolean;
  readonly title: string;
  readonly versionId: string;
}

const toInserted = (done: IconInsertResult): IconInserted => {
  const { plan, version } = done;
  const [first] = plan.select;
  let at: string | null = null;

  if (first) {
    at = `${first.file}:${first.line}:${first.col}`;
  }

  return {
    at,
    file: plan.target.relative,
    icon: plan.icon,
    importAdded: plan.importAdded,
    importFrom: plan.importFrom,
    library: plan.library,
    markup: plan.markup,
    select: plan.select,
    swapped: plan.swapped,
    title: version.title,
    versionId: version.id,
  };
};

const toInsertTarget = (target: IconTarget): InsertTarget => {
  const out: InsertTarget = { source: target.source };

  if (target.owners !== null) {
    out.owners = target.owners.map((owner) => ({ ...owner }));
  }

  if (target.selector !== null) {
    out.selector = target.selector;
  }

  if (target.tag !== null) {
    out.tag = target.tag;
  }

  return out;
};

const toInsertRequest = (command: InsertIconCommand): IconInsertRequest => {
  const request: IconInsertRequest = {
    name: command.name,
    position: command.position,
    size: command.size,
    target: toInsertTarget(command.target),
  };

  if (command.color !== null) {
    request.color = command.color;
  }

  if (command.library !== null) {
    request.library = command.library;
  }

  return request;
};

const runIconInspect = (
  command: InspectIconCommand
): Effect.Effect<IconList, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      listIcons(
        { project, workTree: direction.workTree },
        {
          library: command.library,
          limit: command.limit,
          query: command.query,
        }
      ),
    toIconFailure
  );

const runIconInsert = (
  command: InsertIconCommand
): Effect.Effect<IconInserted, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<IconInserted> => {
      const previewOrigin = await previewOriginOf(
        runtime.preview,
        project,
        direction
      );

      const done = await applyIconInsert(
        runtime.editDeps,
        { direction, previewOrigin, project, workTree: direction.workTree },
        toInsertRequest(command)
      );

      return toInserted(done);
    },
    toIconFailure
  );

export { runIconInsert, runIconInspect };

export type { IconInserted, InspectIconCommand, InsertIconCommand };
