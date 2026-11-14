import type { Input } from "@design-studio/actions/_core/action";
import type { getRun } from "@design-studio/actions/run/get";
import { Effect } from "effect";

import {
  RunDecisionStore,
  RunLogStore,
  RunWaitStore,
} from "../../run-log/index.js";
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

const toNewEvents = <Event>(
  events: readonly Event[],
  afterEvent: number | null
): readonly Event[] => {
  if (afterEvent === null) {
    return events;
  }

  return events.slice(afterEvent);
};

const handle = Effect.fn("run.get")(function* run(input: GetRunInput) {
  const service = yield* RunLogStore;
  const decisionStore = yield* RunDecisionStore;
  const waitStore = yield* RunWaitStore;

  if (input.waitSeconds > 0) {
    yield* service.get(input.projectId, input.runId);
    yield* waitStore.wait(input.runId, input.waitSeconds);
  }

  const detail = yield* service.get(input.projectId, input.runId);
  const decisions = yield* decisionStore.list(input.projectId, input.runId);

  return {
    ...detail,
    decisions,
    eventCount: detail.events.length,
    events: toNewEvents(detail.events, input.afterEvent),
    selectionPicture: detail.summary?.request.selectionPicture ?? null,
    status: toRunStatus(detail.summary),
  };
}) satisfies Handle<typeof getRun>;

export { handle };
