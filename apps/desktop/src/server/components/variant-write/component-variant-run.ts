import type { Effect } from "effect";

import type { PreviewTarget } from "../../../shared/component-ports.js";
import {
  runDirectionRead,
  runDirectionWrite,
} from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { toComponentVariantFailure } from "./component-variant-failure.js";
import type {
  ComponentVariantChange,
  ComponentVariantResult,
  ComponentVariantTarget,
} from "./deps.js";
import { ComponentVariantError } from "./errors.js";
import { previewVariant, toVariantResult, writeVariant } from "./write.js";

interface WriteComponentVariantCommand extends DirectionIds {
  readonly change: ComponentVariantChange;
  readonly target: ComponentVariantTarget;
}

interface GetComponentVariantCommand extends DirectionIds {
  readonly className: string | null;
  readonly file: string;
  readonly key: string;
  readonly name: string;
  readonly value: string;
}

interface ComponentVariantWritten extends ComponentVariantResult {
  readonly png: string | null;
}

interface ComponentVariantPreviewed {
  readonly hash: string | null;
  readonly png: string | null;
  readonly reason: string | null;
}

const toPreviewProps = (
  command: GetComponentVariantCommand
): PreviewTarget["props"] => {
  if (command.className !== null && command.className !== "") {
    return { [command.key]: command.value, className: command.className };
  }

  return { [command.key]: command.value };
};

const toReason = (cause: unknown): string => {
  if (cause instanceof Error) {
    return cause.message;
  }

  return String(cause);
};

const runComponentVariantWrite = (
  command: WriteComponentVariantCommand
): Effect.Effect<ComponentVariantWritten, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({
      direction,
      project,
      runtime,
    }): Promise<ComponentVariantWritten> => {
      const { target } = command;

      if (target.name === null && target.file === null) {
        throw new ComponentVariantError("Pass the component name or its file.");
      }

      if (project.kind !== "react") {
        throw new ComponentVariantError(
          "This is an HTML project. It has no component kit."
        );
      }

      const scope = { direction, project, workTree: direction.workTree };

      const { plan, version } = await writeVariant(runtime.editDeps, scope, {
        change: command.change,
        target,
      });

      const preview = await previewVariant(runtime.preview, scope, plan);
      const result = toVariantResult(plan, version, preview);

      if (!preview.ok) {
        return { ...result, png: null };
      }

      return { ...result, png: preview.png.toString("base64") };
    },
    toComponentVariantFailure
  );

const runComponentVariantPreview = (
  command: GetComponentVariantCommand
): Effect.Effect<ComponentVariantPreviewed, KnownFailure> =>
  runDirectionRead(
    command,
    async ({
      direction,
      project,
      runtime,
    }): Promise<ComponentVariantPreviewed> => {
      try {
        const result = await runtime.previews.render(project, direction, {
          file: command.file,
          name: command.name,
          props: toPreviewProps(command),
        });

        if (!result.ok) {
          return { hash: null, png: null, reason: result.reason };
        }

        return {
          hash: result.hash,
          png: result.png.toString("base64"),
          reason: null,
        };
      } catch (error) {
        return { hash: null, png: null, reason: toReason(error) };
      }
    },
    toComponentVariantFailure
  );

export { runComponentVariantPreview, runComponentVariantWrite };

export type {
  ComponentVariantPreviewed,
  ComponentVariantWritten,
  GetComponentVariantCommand,
  WriteComponentVariantCommand,
};
