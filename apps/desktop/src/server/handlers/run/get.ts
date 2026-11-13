import type { Input } from "@design-studio/actions/_core/action";
import type { getRun } from "@design-studio/actions/run/get";
import { Effect } from "effect";

import { RunDecisionStore, RunLogStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type GetRunInput = Input<typeof getRun>;

const toRunStatus = (
  summary: { readonly status: string } | null
): string | null => {
  if (summary === null) {
    return null;
  }

  return summary.status;
};

const handle = Effect.fn("run.get")(function* run(input: GetRunInput) {
  const service = yield* RunLogStore;
  const decisionStore = yield* RunDecisionStore;

  const detail = yield* service.get(input.projectId, input.runId);
  const decisions = yield* decisionStore.list(input.projectId, input.runId);

  return {
    ...detail,
    decisions,
    selectionPicture: detail.summary?.request.selectionPicture ?? null,
    status: toRunStatus(detail.summary),
  };
}) satisfies Handle<typeof getRun>;

export { handle };
