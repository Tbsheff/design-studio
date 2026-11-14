import type { Effect } from "effect";

import {
  runDirectionRead,
  runDirectionWrite,
} from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import type { SourceLoc } from "./deps.js";
import type {
  DividerAxis,
  DividerClassChanges,
  DividerPaint,
} from "./divider-classes.js";
import { applyDivider, inspectDivider } from "./divider-edit.js";
import type { DividerInfo, DividerTarget } from "./divider-edit.js";
import { toDividerFailure } from "./divider-failure.js";

interface GetDividerCommand extends DirectionIds {
  readonly source: SourceLoc;
  readonly variant: string;
}

interface SetDividerCommand extends DirectionIds {
  readonly paint: DividerPaint;
  readonly target: DividerTarget;
  readonly variant: string;
}

interface DividerChange {
  readonly axis: DividerAxis | null;
  readonly classes: DividerClassChanges;
  readonly files: readonly string[];
  readonly title: string;
  readonly versionId: string;
}

const runDividerGet = (
  command: GetDividerCommand
): Effect.Effect<DividerInfo, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      inspectDivider(
        { direction, project, workTree: direction.workTree },
        command.source,
        command.variant
      ),
    toDividerFailure
  );

const runDividerSet = (
  command: SetDividerCommand
): Effect.Effect<DividerChange, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<DividerChange> => {
      const done = await applyDivider(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        {
          paint: command.paint,
          target: command.target,
          variant: command.variant,
        }
      );

      return {
        axis: command.paint.axis,
        classes: done.classes,
        files: done.written.map((entry) => entry.target.relative),
        title: done.title,
        versionId: done.version.id,
      };
    },
    toDividerFailure
  );

export { runDividerGet, runDividerSet };

export type { DividerChange, GetDividerCommand, SetDividerCommand };
