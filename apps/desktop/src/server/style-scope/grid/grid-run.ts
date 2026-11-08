import type { Effect } from "effect";

import {
  runDirectionRead,
  runDirectionWrite,
} from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import type {
  GridInfo,
  GridInput,
  GridItemInput,
  GridSetResult,
  SourceLoc,
} from "./deps.js";
import { inspectGrid } from "./get.js";
import { toGridFailure } from "./grid-failure.js";
import { applyGridEdit, toGridResult } from "./plan.js";
import type { GridTarget } from "./plan.js";
import { toGridParts, toItemParts } from "./set.js";

interface GetGridCommand extends DirectionIds {
  readonly breakpoint: string;
  readonly limit: number;
  readonly source: SourceLoc;
}

interface SetGridCommand extends DirectionIds {
  readonly fields: GridInput;
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface SetGridItemCommand extends DirectionIds {
  readonly fields: GridItemInput;
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

type GridChange = GridSetResult;

const BASE = "base";

const toTarget = (
  command: SetGridCommand | SetGridItemCommand
): GridTarget => ({
  selector: command.selector,
  source: command.source,
  tag: command.tag,
});

const runGridGet = (
  command: GetGridCommand
): Effect.Effect<GridInfo, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      inspectGrid(
        { direction, project, workTree: direction.workTree },
        {
          breakpoint: command.breakpoint,
          limit: command.limit,
          source: command.source,
        }
      ),
    toGridFailure
  );

const runGridSet = (
  command: SetGridCommand
): Effect.Effect<GridChange, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<GridChange> => {
      const { plan, version } = await applyGridEdit(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        {
          breakpoint: command.fields.breakpoint ?? BASE,
          target: toTarget(command),
          toParts: (site) => toGridParts(site, command.fields, command.source),
        }
      );

      return toGridResult(plan, version);
    },
    toGridFailure
  );

const runGridSetItem = (
  command: SetGridItemCommand
): Effect.Effect<GridChange, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<GridChange> => {
      const { plan, version } = await applyGridEdit(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        {
          breakpoint: command.fields.breakpoint ?? BASE,
          target: toTarget(command),
          toParts: (site) => toItemParts(site, command.fields, command.source),
        }
      );

      return toGridResult(plan, version);
    },
    toGridFailure
  );

export { runGridGet, runGridSet, runGridSetItem };

export type { GetGridCommand, GridChange, SetGridCommand, SetGridItemCommand };
