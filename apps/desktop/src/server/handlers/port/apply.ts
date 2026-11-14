import type { Input } from "@design-studio/actions/_core/action";
import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { applyPort } from "@design-studio/actions/port/apply";
import { PORT_APPLY_MAX } from "@design-studio/actions/port/schema";
import type {
  PortApplied,
  PortWrite,
} from "@design-studio/actions/port/schema";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import { RouteSourceStore } from "../../project-ops/index.js";
import {
  PortMatchStore,
  toPortRouteUpdate,
  toPortSourceCommand,
} from "../../review/index.js";
import type { PortApplyCheck, PortApplyTarget } from "../../review/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { DirectEditWriterApi } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type ApplyPortInput = Input<typeof applyPort>;

interface ApplyTarget {
  readonly directionId: string;
  readonly target: PortApplyTarget;
}

const AREA_LIMIT = 9;

const CARD_LINES_MAX = 12;

const NO_APP = "The app project has no direction to write to.";

const readApplyTarget = Effect.fn("port.apply.target")(function* run(
  input: ApplyPortInput
) {
  const projects = yield* ProjectStore;
  const project = yield* projects.get(input.targetProjectId);
  const direction = project.directions[0] ?? null;

  if (direction === null) {
    return yield* new NotFound({ message: NO_APP });
  }

  const found: ApplyTarget = {
    directionId: direction.id,
    target: { projectKind: project.kind, workTree: direction.workTree },
  };

  return found;
});

const readApplyCheck = Effect.fn("port.apply.check")(function* run(
  input: ApplyPortInput,
  target: PortApplyTarget,
  shouldSource: boolean
) {
  const reads = yield* McpReadStore;
  const store = yield* PortMatchStore;
  const routeSource = yield* RouteSourceStore;

  const changes = yield* routeSource
    .inspectChanges(toPortSourceCommand(input))
    .pipe(Effect.orElseSucceed(() => null));

  return yield* store.planApply(
    reads,
    {
      appWorkTree: target.workTree,
      directionId: input.directionId,
      isSourced: shouldSource,
      limit: AREA_LIMIT,
      path: input.path,
      projectId: input.projectId,
      routePath: input.routePath,
      targetProjectId: input.targetProjectId,
      update: toPortRouteUpdate(changes, input),
      width: input.width,
    },
    target
  );
});

type WriteOutcome = Effect.Success<ReturnType<DirectEditWriterApi["apply"]>>;

const toVersionId = (outcome: WriteOutcome): string | null => {
  if (!("version" in outcome) || outcome.version === null) {
    return null;
  }

  return outcome.version.id;
};

const toApplied = (
  check: PortApplyCheck,
  afterScore: number,
  writtenVersionId: string | null
): PortApplied => ({
  applied: check.plan.writes.slice(0, PORT_APPLY_MAX),
  scoreAfter: afterScore,
  scoreBefore: check.match.score,
  skipped: check.plan.skipped.slice(0, PORT_APPLY_MAX),
  versionId: writtenVersionId,
});

const handle = Effect.fn("port.apply")(function* run(input: ApplyPortInput) {
  const found = yield* readApplyTarget(input);
  const check = yield* readApplyCheck(input, found.target, true);

  if (check.plan.requests.length === 0) {
    return toApplied(check, check.match.score, null);
  }

  const writer = yield* DirectEditWriter;

  const outcome = yield* writer.apply(
    { directionId: found.directionId, projectId: input.targetProjectId },
    { edits: check.plan.requests }
  );

  const after = yield* readApplyCheck(input, found.target, false);

  return toApplied(check, after.match.score, toVersionId(outcome));
}) satisfies Handle<typeof applyPort>;

const toWriteLine = (write: PortWrite): string =>
  `${write.selector} "${write.text}": ${write.property} ${write.app} to ${write.prototype} (${write.written})`;

const toCard = (input: ApplyPortInput, check: PortApplyCheck): ApprovalCard => {
  const lines = check.plan.writes.map((write) => toWriteLine(write));
  const shown = lines.slice(0, CARD_LINES_MAX);
  const more = lines.length - shown.length;

  if (more > 0) {
    shown.push(`and ${more} more`);
  }

  if (shown.length === 0) {
    shown.push("No paired value can be written. Nothing changes.");
  }

  return {
    action: "apply_port",
    detail: shown.join("\n"),
    title: `Write ${lines.length} prototype values into ${input.routePath}`,
  };
};

const preview = Effect.fn("port.apply.preview")(function* card(
  input: ApplyPortInput
) {
  const found = yield* readApplyTarget(input);
  const check = yield* readApplyCheck(input, found.target, true);

  return toCard(input, check);
}) satisfies Preview<typeof applyPort>;

export { handle, preview };
