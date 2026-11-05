import type { Effect } from "effect";

import { runDirectionRead, runDirectionWrite } from "../direct-edit/index.js";
import type { DirectionIds } from "../direct-edit/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { toAccessibilityFailure } from "./accessibility-failure.js";
import { readDesignSystemState, withPagePath } from "./deps.js";
import type {
  AccessibilityReport,
  AccessibilitySetResult,
  SourceLoc,
} from "./deps.js";
import { AccessibilityError } from "./errors.js";
import { NO_ACCESSIBILITY_CHANGE, toAccessibilityChanges } from "./input.js";
import type { AccessibilityFieldsInput } from "./input.js";
import { inspectAccessibilityPage } from "./inspect.js";
import { toAccessibilityFrame } from "./live-frame.js";
import { setAccessibilityAttributes, toAccessibilityResult } from "./set.js";

interface InspectAccessibilityCommand extends DirectionIds {
  readonly frame: string | null;
  readonly isPassingIncluded: boolean;
  readonly limit: number;
  readonly selector: string | null;
}

interface SetAccessibilityCommand extends DirectionIds {
  readonly fields: AccessibilityFieldsInput;
  readonly source: SourceLoc;
  readonly tag: string | null;
  readonly usedAt: SourceLoc | null;
}

const runAccessibilityInspect = (
  command: InspectAccessibilityCommand
): Effect.Effect<AccessibilityReport, KnownFailure> =>
  runDirectionRead(
    command,
    async ({ direction, project, runtime }): Promise<AccessibilityReport> => {
      const frame = await toAccessibilityFrame(
        runtime.canvas,
        project,
        direction,
        command.frame
      );

      const page = frame.page ?? "";

      const [base, state] = await Promise.all([
        runtime.preview.directionUrl(project, direction),
        readDesignSystemState(project, direction),
      ]);

      const report = await inspectAccessibilityPage(
        runtime.preview,
        state.entries,
        {
          frame: frame.id,
          page: page || "/",
          passing: command.isPassingIncluded,
          root: command.selector,
          url: withPagePath(base, page),
          viewport: frame.viewport,
        }
      );

      return {
        ...report,
        contrast: report.contrast.slice(0, command.limit),
        missingAlt: report.missingAlt.slice(0, command.limit),
        tabOrder: report.tabOrder.slice(0, command.limit),
        unnamed: report.unnamed.slice(0, command.limit),
      };
    },
    toAccessibilityFailure
  );

const runAccessibilitySet = (
  command: SetAccessibilityCommand
): Effect.Effect<AccessibilitySetResult, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({
      direction,
      project,
      runtime,
    }): Promise<AccessibilitySetResult> => {
      const changes = toAccessibilityChanges(command.fields);

      if (changes === null) {
        throw new AccessibilityError(NO_ACCESSIBILITY_CHANGE);
      }

      const done = await setAccessibilityAttributes(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        {
          changes,
          target: {
            source: command.source,
            tag: command.tag,
            usedAt: command.usedAt,
          },
        }
      );

      return toAccessibilityResult(done.plan, done.version);
    },
    toAccessibilityFailure
  );

export { runAccessibilityInspect, runAccessibilitySet };

export type { InspectAccessibilityCommand, SetAccessibilityCommand };
