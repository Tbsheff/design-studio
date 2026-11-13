import type { Input } from "@design-studio/actions/_core/action";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { setDecisionRun } from "@design-studio/actions/run/set-decision";
import type { RunRequest, RunSummary } from "@design-studio/contracts";
import { Effect } from "effect";

import {
  RunDecisionStore,
  RunDecisionWriter,
  RunLogStore,
  RunLogWriter,
} from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type SetDecisionRunInput = Input<typeof setDecisionRun>;

type FollowUpBody = Pick<RunRequest, "canvas" | "level" | "mode" | "prompt">;

interface FollowUpCall {
  readonly projectId: string;
  readonly summary: RunSummary;
  readonly text: string;
}

const toSteerText = (topic: string, option: string): string =>
  `Use ${option} for ${topic}. Keep the rest of the design as it is.`;

const toFollowUpBody = (summary: RunSummary, text: string): FollowUpBody => {
  const { canvas, level } = summary.request;

  return {
    mode: "edit",
    prompt: text,
    ...(canvas && { canvas }),
    ...(level && { level }),
  };
};

const startFollowUp = Effect.fn("run.setDecision.startFollowUp")(function* run(
  call: FollowUpCall
) {
  const writer = yield* RunLogWriter;

  const started = yield* writer.start({
    body: toFollowUpBody(call.summary, call.text),
    directionId: call.summary.directionId,
    projectId: call.projectId,
  });

  return { isSteer: false, runId: started.runId };
});

const steerOrFollowUp = Effect.fn("run.setDecision.steerOrFollowUp")(
  function* run(runId: string, call: FollowUpCall) {
    const writer = yield* RunLogWriter;

    if (call.summary.status !== "running") {
      return yield* startFollowUp(call);
    }

    return yield* writer.steer(call.projectId, runId, call.text).pipe(
      Effect.as({ isSteer: true, runId }),
      Effect.catchTag("Conflict", () => startFollowUp(call)),
      Effect.catchTag("NotFound", () => startFollowUp(call))
    );
  }
);

const handle = Effect.fn("run.setDecision")(function* run(
  input: SetDecisionRunInput
) {
  const decisionStore = yield* RunDecisionStore;
  const decisionWriter = yield* RunDecisionWriter;
  const runStore = yield* RunLogStore;
  const { decisionId, option, projectId, runId } = input;

  const record = yield* decisionStore.get(projectId, runId, decisionId);

  if (record.picked === option && record.result !== null) {
    return record.result;
  }

  const { summary } = yield* runStore.get(projectId, runId);

  if (summary === null) {
    return yield* new NotFound({
      message: `Run ${runId} has no summary yet. Try again in a moment.`,
    });
  }

  const text = toSteerText(record.topic, option);
  const result = yield* steerOrFollowUp(runId, { projectId, summary, text });

  yield* decisionWriter.pick({ decisionId, option, projectId, result, runId });

  return result;
}) satisfies Handle<typeof setDecisionRun>;

export { handle };
