import { assertCanEdit, publishVersion, writeAndCommitAll } from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  InsertScope,
  Version,
} from "./deps.js";
import { planIconInsert } from "./insert.js";
import type { IconInsertPlan, IconInsertRequest } from "./insert.js";

interface IconInsertResult {
  plan: IconInsertPlan;
  version: Version;
}

interface IconEditScope extends InsertScope {
  direction: Direction;
}

const whereOf = (plan: IconInsertPlan): string => {
  const [at] = plan.select;

  if (!at) {
    return plan.target.relative;
  }

  return `${at.file}:${at.line}:${at.col}`;
};

const applyIconInsert = async (
  deps: DirectEditDeps,
  scope: IconEditScope,
  request: IconInsertRequest
): Promise<IconInsertResult> => {
  const { direction, project } = scope;

  assertCanEdit(deps, project, direction);
  const plan = await planIconInsert(scope, request);

  const version = await writeAndCommitAll(
    deps,
    project,
    direction,
    [plan],
    plan.title,
    { kind: "manual", prompt: `${plan.title}: ${whereOf(plan)}` }
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

export { applyIconInsert };

export type { IconEditScope, IconInsertResult };
