import type { CHART_POSITIONS } from "@design-studio/actions/chart/schema";
import type { Effect } from "effect";

import {
  runDirectionRead,
  runDirectionWrite,
  toPreviewOrigin,
} from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { applyChartInsert } from "./chart-apply.js";
import { toChartFailure } from "./chart-failure.js";
import { inspectChartProject } from "./chart-probe.js";
import type { ChartMode } from "./chart-probe.js";
import { ChartRequestError } from "./chart-request-error.js";
import { toChartTarget } from "./chart-target.js";
import { toSampleRows } from "./engine/index.js";
import type {
  ChartKind,
  ChartRow,
  ChartSeries,
  ChartSpec,
} from "./engine/index.js";

type ChartPosition = (typeof CHART_POSITIONS)[number];

interface InspectChartCommand {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface InsertChartCommand extends InspectChartCommand {
  readonly hasLegend: boolean;
  readonly height: number;
  readonly isStacked: boolean;
  readonly kind: ChartKind;
  readonly layerId: string;
  readonly position: ChartPosition;
  readonly rows: readonly ChartRow[] | null;
  readonly series: readonly ChartSeries[];
  readonly title: string | null;
}

interface ChartInspected {
  readonly colorTokens: readonly string[];
  readonly kinds: readonly ChartKind[];
  readonly kitImportPath: string | null;
  readonly mode: ChartMode;
  readonly rechartsVersion: string | null;
}

interface ChartInserted {
  readonly file: string;
  readonly layerId: string;
  readonly mode: ChartMode;
  readonly versionId: string;
}

interface ChartIds {
  readonly directionId: string;
  readonly projectId: string;
}

const MAIN_DIRECTION_ID = "main";

const toDirectionId = (directionId: string | null): string => {
  if (directionId === null) {
    return MAIN_DIRECTION_ID;
  }

  return directionId;
};

const toIds = (command: InspectChartCommand): ChartIds => ({
  directionId: toDirectionId(command.directionId),
  projectId: command.projectId,
});

const getCheckedRows = (
  series: readonly ChartSeries[],
  rows: readonly ChartRow[]
): readonly ChartRow[] => {
  const keys = new Set(series.map((item) => item.key));

  if (keys.size !== series.length) {
    throw new ChartRequestError("Each series needs its own key.");
  }

  const bad = rows.find((row) => row.values.length !== series.length);

  if (bad) {
    throw new ChartRequestError(
      `The row ${bad.label} has ${bad.values.length} values, but there are ${series.length} series.`
    );
  }

  return rows;
};

const toChartSpec = (command: InsertChartCommand): ChartSpec => {
  const { series } = command;
  const given = command.rows ?? [];
  const checked = getCheckedRows(series, given);
  let rows = checked;

  if (command.rows === null) {
    rows = toSampleRows(command.kind, series);
  }

  const base = {
    hasLegend: command.hasLegend,
    height: command.height,
    kind: command.kind,
    title: command.title,
  };

  if (command.kind === "pie") {
    return {
      ...base,
      isStacked: false,
      rows: rows.map((row) => ({
        label: row.label,
        values: row.values.slice(0, 1),
      })),
      series: series.slice(0, 1),
    };
  }

  return { ...base, isStacked: command.isStacked, rows, series };
};

const runChartInspect = (
  command: InspectChartCommand
): Effect.Effect<ChartInspected, KnownFailure> =>
  runDirectionRead(
    toIds(command),
    async ({ direction, project }): Promise<ChartInspected> => {
      const found = await inspectChartProject(project, direction.workTree);

      return {
        colorTokens: found.colorTokens,
        kinds: found.kinds,
        kitImportPath: found.kit?.importPath ?? null,
        mode: found.mode,
        rechartsVersion: found.rechartsVersion,
      };
    },
    toChartFailure
  );

const runChartInsert = (
  command: InsertChartCommand
): Effect.Effect<ChartInserted, KnownFailure> =>
  runDirectionWrite(
    toIds(command),
    async (run): Promise<ChartInserted> => {
      const { direction, project, runtime } = run;
      const { position } = command;
      const spec = toChartSpec(command);
      const { workTree } = direction;

      const [inspection, previewOrigin, target] = await Promise.all([
        inspectChartProject(project, workTree),
        toPreviewOrigin(runtime.preview, project, direction),
        toChartTarget({
          direction: run.direction,
          layerId: command.layerId,
          preview: runtime.preview,
          project: run.project,
        }),
      ]);

      const done = await applyChartInsert(
        runtime.editDeps,
        { direction, previewOrigin, project, workTree },
        { inspection, position, spec, target }
      );

      return {
        file: done.plan.target.relative,
        layerId: done.plan.layerId,
        mode: done.plan.mode,
        versionId: done.version.id,
      };
    },
    toChartFailure
  );

export { runChartInsert, runChartInspect };

export type {
  ChartInserted,
  ChartInspected,
  InsertChartCommand,
  InspectChartCommand,
};
