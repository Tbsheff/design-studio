import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { MeasurementsSchema } from "@design-studio/actions/dev-note/schema";
import { SOURCE_LOC_ATTR } from "@design-studio/contracts";
import type { SourceLoc } from "@design-studio/contracts";
import type { Effect } from "effect";

import {
  runDirectionRead,
  toDirectEditStatusFailure,
} from "../../direct-edit/index.js";
import type {
  DirectEditStatusFailure,
  DirectionRun,
} from "../../direct-edit/index.js";
import {
  EditError,
  LayerRefError,
  describeElements,
  isLayerRef,
  memoPage,
  probeOnPage,
  resolveLayerRefs,
  resolveSourceLoc,
  scopeOf,
  toProbeTarget,
} from "../../page-probe/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { withPagePath } from "../../project-source/index.js";
import { toMeasureExpression } from "./dev-note-probe.js";

type Measurements = typeof MeasurementsSchema.Type;

interface MeasureCommand {
  readonly directionId: string;
  readonly framePath: string | null;
  readonly frameSize: { readonly height: number; readonly width: number };
  readonly layerId: string;
  readonly projectId: string;
}

interface Measured {
  readonly measurements: Measurements;
  readonly source: SourceLoc | null;
}

type RawMeasure = Omit<Measurements, "measuredAt">;

const toLocSelector = (loc: SourceLoc): string =>
  `[${SOURCE_LOC_ATTR}="${loc.file}:${loc.line}:${loc.col}"]`;

const toPagePath = (command: MeasureCommand, scope: string): string | null => {
  if (command.framePath !== null && command.framePath !== "") {
    return command.framePath;
  }

  if (isLayerRef(command.layerId)) {
    return memoPage(scope, command.layerId.trim()) ?? null;
  }

  return null;
};

const toSelector = async (
  run: DirectionRun,
  command: MeasureCommand,
  target: { readonly scope: string; readonly url: string }
): Promise<{ readonly loc: SourceLoc | null; readonly selector: string }> => {
  if (isLayerRef(command.layerId)) {
    const selectors = await resolveLayerRefs(
      toProbeTarget(
        run.runtime.preview,
        target.url,
        command.frameSize,
        target.scope
      ),
      [command.layerId.trim()]
    );

    return {
      loc: null,
      selector: selectors.get(command.layerId.trim()) ?? "",
    };
  }

  const loc = await resolveSourceLoc(
    run.direction.workTree,
    target.scope,
    command.layerId
  );

  return { loc, selector: toLocSelector(loc) };
};

const toMeasured = async (
  run: DirectionRun,
  command: MeasureCommand
): Promise<Measured> => {
  const scope = scopeOf(run.project.id, run.direction.id);

  const base = await run.runtime.preview.directionUrl(
    run.project,
    run.direction
  );

  const page = toPagePath(command, scope);
  let url = base;

  if (page !== null) {
    url = withPagePath(base, page);
  }

  const found = await toSelector(run, command, { scope, url });

  if (found.selector === "") {
    throw new LayerRefError(
      `Layer ${command.layerId} is not on the page. Call get_layers for current ids.`
    );
  }

  const [contexts, raw] = await Promise.all([
    describeElements(run.runtime.preview, url, [found.selector]),
    probeOnPage<RawMeasure | null>(
      run.runtime.preview,
      url,
      command.frameSize,
      toMeasureExpression(found.selector)
    ),
  ]);

  const [context] = contexts;

  if (raw === null) {
    throw new LayerRefError(
      `Layer ${command.layerId} is not on the page. Call get_layers for current ids.`
    );
  }

  return {
    measurements: { ...raw, measuredAt: Date.now() },
    source: context?.source ?? found.loc,
  };
};

type MeasureFailure = BadRequest | DirectEditStatusFailure | NotFound;

const toMeasureFailure = (cause: unknown): MeasureFailure | null => {
  if (cause instanceof LayerRefError) {
    return new NotFound({ message: cause.message });
  }

  if (cause instanceof EditError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

const getMeasured = (
  command: MeasureCommand
): Effect.Effect<Measured, KnownFailure | MeasureFailure> =>
  runDirectionRead(
    { directionId: command.directionId, projectId: command.projectId },
    (run) => toMeasured(run, command),
    toMeasureFailure
  );

export { getMeasured };

export type { MeasureCommand, Measured, Measurements };
