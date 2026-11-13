import type { Input } from "@design-studio/actions/_core/action";
import type { RunDraft } from "@design-studio/actions/run/draft/schema";
import type { getDraftRun } from "@design-studio/actions/run/get-draft";
import { Effect } from "effect";

import { RunDraftStore, RunLogStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type GetDraftRunInput = Input<typeof getDraftRun>;

const EMPTY_KIND: RunDraft["kind"] = "write";

const isRunDone = (summary: { readonly status: string } | null): boolean =>
  summary !== null && summary.status !== "running";

const handle = Effect.fn("run.getDraft")(function* run(
  input: GetDraftRunInput
) {
  const drafts = yield* RunDraftStore;
  const draft = yield* drafts.get(input.projectId, input.runId);

  if (draft !== null) {
    return draft;
  }

  const runs = yield* RunLogStore;
  const detail = yield* runs.get(input.projectId, input.runId);

  return {
    bytes: 0,
    html: null,
    isComplete: isRunDone(detail.summary),
    kind: EMPTY_KIND,
    path: null,
  };
}) satisfies Handle<typeof getDraftRun>;

export { handle };
