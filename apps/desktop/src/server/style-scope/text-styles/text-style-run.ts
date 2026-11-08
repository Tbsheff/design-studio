import type { Effect } from "effect";

import {
  runDirectionRead,
  runDirectionWrite,
} from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { applyTextStyleEdit } from "./apply.js";
import type { TextStyleTarget } from "./apply.js";
import { commitOne, guardEdit } from "./commit.js";
import { computedTextValues, createTextStyleToken } from "./create.js";
import type { SourceLoc, TextStyleList, TextStyleValues } from "./deps.js";
import { createTextStyleDetach } from "./detach.js";
import { listTextStyles, TextStyleError } from "./list.js";
import { toTextStyleFailure } from "./text-style-failure.js";
import { toProbedElement } from "./text-style-probe.js";
import type { TextStyleProbe } from "./text-style-probe.js";

interface InspectTextStyleCommand extends DirectionIds {
  readonly limit: number;
  readonly query: string;
}

interface ApplyTextStyleCommand extends DirectionIds {
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly style: string;
  readonly tag: string | null;
}

interface CreateTextStyleCommand extends DirectionIds, TextStyleProbe {
  readonly name: string;
  readonly styles: Readonly<Record<string, string>> | null;
}

interface DetachTextStyleCommand extends DirectionIds, TextStyleProbe {
  readonly source: SourceLoc | null;
  readonly styles: Readonly<Record<string, string>> | null;
  readonly tag: string | null;
}

interface TextStyleApplied {
  readonly classes: {
    readonly add: readonly string[];
    readonly remove: readonly string[];
  } | null;
  readonly file: string;
  readonly mode: "classes" | "css";
  readonly style: string;
  readonly title: string;
  readonly versionId: string;
}

interface TextStyleCreated {
  readonly file: string;
  readonly name: string;
  readonly source: TextStyleList["sources"][number];
  readonly title: string;
  readonly values: TextStyleValues;
  readonly versionId: string;
}

interface TextStyleDetached {
  readonly file: string;
  readonly title: string;
  readonly versionId: string;
}

const NO_SOURCE = "The element has no source location.";

const DETACH_TITLE = "Detach text style";

const toApplyTarget = (command: ApplyTextStyleCommand): TextStyleTarget => {
  const target: TextStyleTarget = { source: command.source };

  if (command.selector !== null) {
    target.selector = command.selector;
  }

  if (command.tag !== null) {
    target.tag = command.tag;
  }

  return target;
};

const runTextStyleInspect = (
  command: InspectTextStyleCommand
): Effect.Effect<TextStyleList, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction }) =>
      listTextStyles(
        { workTree: direction.workTree },
        { limit: command.limit, query: command.query }
      ),
    toTextStyleFailure
  );

const runTextStyleApply = (
  command: ApplyTextStyleCommand
): Effect.Effect<TextStyleApplied, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<TextStyleApplied> => {
      const { plan, version } = await applyTextStyleEdit(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        {
          style: command.style,
          target: toApplyTarget(command),
        }
      );

      return {
        classes: plan.classes,
        file: plan.written.target.relative,
        mode: plan.mode,
        style: plan.style.name,
        title: version.title,
        versionId: version.id,
      };
    },
    toTextStyleFailure
  );

const runTextStyleCreate = (
  command: CreateTextStyleCommand
): Effect.Effect<TextStyleCreated, KnownFailure> =>
  runDirectionWrite(
    command,
    async (run): Promise<TextStyleCreated> => {
      const { direction, project, runtime } = run;
      let { styles } = command;

      if (styles === null) {
        ({ styles } = await toProbedElement(run, command));
      }

      const { plan, version } = await createTextStyleToken(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        { name: command.name, values: computedTextValues({ ...styles }) }
      );

      return {
        file: plan.written.target.relative,
        name: plan.name,
        source: plan.source,
        title: version.title,
        values: plan.values,
        versionId: version.id,
      };
    },
    toTextStyleFailure
  );

const runTextStyleDetach = (
  command: DetachTextStyleCommand
): Effect.Effect<TextStyleDetached, KnownFailure> =>
  runDirectionWrite(
    command,
    async (run): Promise<TextStyleDetached> => {
      const { direction, project, runtime } = run;
      const scope = { direction, project, workTree: direction.workTree };
      let { source, styles } = command;

      if (styles === null || source === null) {
        const probed = await toProbedElement(run, command);

        ({ source } = probed);
        styles = command.styles ?? probed.styles;
      }

      if (source === null) {
        throw new TextStyleError(NO_SOURCE);
      }

      guardEdit(runtime.editDeps, scope);

      const { selector, tag } = command;

      const written = await createTextStyleDetach(scope, {
        styles,
        target: { selector, source, tag },
      });

      const version = await commitOne(
        runtime.editDeps,
        scope,
        written,
        DETACH_TITLE
      );

      return {
        file: written.target.relative,
        title: version.title,
        versionId: version.id,
      };
    },
    toTextStyleFailure
  );

export {
  runTextStyleApply,
  runTextStyleCreate,
  runTextStyleDetach,
  runTextStyleInspect,
};

export type {
  ApplyTextStyleCommand,
  CreateTextStyleCommand,
  DetachTextStyleCommand,
  InspectTextStyleCommand,
  TextStyleApplied,
  TextStyleCreated,
  TextStyleDetached,
};
