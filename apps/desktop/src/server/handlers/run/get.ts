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

const toNewSent = <Sent>(
  sent: readonly Sent[],
  sentAfter: readonly number[],
  afterEvent: number | null
): readonly Sent[] => {
  if (afterEvent === null) {
    return sent;
  }

  return sent.filter((_record, index) => (sentAfter[index] ?? 0) >= afterEvent);
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
  const picks = yield* decisionStore.list(input.projectId, input.runId);
  const { events, sent, sentAfter } = detail;
  const runSummary = detail.summary;

  return {
    decisions: picks,
    eventCount: events.length,
    events: toNewEvents(events, input.afterEvent),
    selectionPicture: runSummary?.request.selectionPicture ?? null,
    sent: toNewSent(sent, sentAfter, input.afterEvent),
    status: toRunStatus(runSummary),
    summary: runSummary,
  };
}) satisfies Handle<typeof getRun>;

export { handle };
