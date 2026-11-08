import type {
  PermissionDecision,
  QueuedMessage,
  RunRequest,
  RunSummary,
  StudioEvent,
} from "@design-studio/contracts";
import type {
  ReviewFixResult,
  ReviewRequest,
  ReviewResult,
} from "@design-studio/contracts/review";

import {
  json,
  enc,
  toProjectPath,
  toDirectionPath,
  RUNS_PAGE,
} from "./api-core.js";
import { startBody } from "./start-body.js";

const runApi = {
  answerPermission: (
    pid: string,
    runId: string,
    requestId: string,
    decision: PermissionDecision
  ): Promise<{ ok: boolean }> =>
    json<{ ok: boolean }>(
      "POST",
      `${toProjectPath(pid)}/runs/${enc(runId)}/permissions/${enc(requestId)}`,
      decision
    ),
  cancelRun: (pid: string, runId: string): Promise<{ ok: boolean }> =>
    json<{ ok: boolean }>(
      "POST",
      `${toProjectPath(pid)}/runs/${enc(runId)}/cancel`
    ),
  getRun: (
    pid: string,
    runId: string
  ): Promise<{ summary: RunSummary; events: StudioEvent[] }> =>
    json<{ summary: RunSummary; events: StudioEvent[] }>(
      "GET",
      `${toProjectPath(pid)}/runs/${enc(runId)}`
    ),
  listRuns: async (pid: string): Promise<RunSummary[]> => {
    const page = await json<{ items: RunSummary[] }>(
      "GET",
      `${toProjectPath(pid)}${RUNS_PAGE}`
    );

    return page.items;
  },
  review: (
    pid: string,
    did: string,
    body: ReviewRequest
  ): Promise<ReviewResult> =>
    json<ReviewResult>("POST", `${toDirectionPath(pid, did)}/review`, body),
  reviewFix: (
    pid: string,
    did: string,
    findingIds: string[]
  ): Promise<ReviewFixResult> =>
    json<ReviewFixResult>("POST", `${toDirectionPath(pid, did)}/review/fix`, {
      allowShared: true,
      findingIds,
    }),
  setQueue: (
    pid: string,
    runId: string,
    items: QueuedMessage[]
  ): Promise<{ ok: boolean }> =>
    json<{ ok: boolean }>(
      "PUT",
      `${toProjectPath(pid)}/runs/${enc(runId)}/queue`,
      {
        items,
      }
    ),
  startRun: (
    pid: string,
    did: string,
    req: RunRequest & { referenceUrls?: string[] }
  ): Promise<{ runId: string }> =>
    json<{ runId: string }>(
      "POST",
      `${toDirectionPath(pid, did)}/runs`,
      startBody(req)
    ),
  steerRun: (
    pid: string,
    runId: string,
    text: string
  ): Promise<{ ok: boolean }> =>
    json<{ ok: boolean }>(
      "POST",
      `${toProjectPath(pid)}/runs/${enc(runId)}/steer`,
      {
        text,
      }
    ),
};

export { runApi };
