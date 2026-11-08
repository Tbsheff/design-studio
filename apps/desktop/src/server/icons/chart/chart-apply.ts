import type { Direction, Version } from "@design-studio/contracts";

import {
  assertCanEdit,
  publishVersion,
  writeAndCommitAll,
} from "../../direct-edit/index.js";
import type { DirectEditDeps, InsertScope } from "../../direct-edit/index.js";
import { createChartPlan } from "./chart-plan.js";
import type { ChartPlan, ChartPlanRequest } from "./chart-plan.js";

interface ChartEditScope extends InsertScope {
  readonly direction: Direction;
}

interface ChartApplied {
  readonly plan: ChartPlan;
  readonly version: Version;
}

const applyChartInsert = async (
  deps: DirectEditDeps,
  scope: ChartEditScope,
  request: ChartPlanRequest
): Promise<ChartApplied> => {
  const { direction, project } = scope;

  assertCanEdit(deps, project, direction);

  const plan = await createChartPlan(scope, request);

  const version = await writeAndCommitAll(
    deps,
    project,
    direction,
    [plan],
    plan.title,
    { kind: "manual", prompt: `${plan.title}: ${plan.layerId}` }
  );

  deps.history?.record({
    directionId: direction.id,
    files: [
      {
        after: plan.code,
        before: plan.original,
        file: plan.target.file,
        relative: plan.target.relative,
      },
    ],
    label: version.title,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(deps, project, direction, version);

  return { plan, version };
};

export { applyChartInsert };

export type { ChartApplied, ChartEditScope };
