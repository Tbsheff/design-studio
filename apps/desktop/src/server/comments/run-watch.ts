import { readFile } from "node:fs/promises";
import path from "node:path";

import type { DesignComment, RunSummary } from "../../shared/actions/_core/contracts.js";
import { logError } from "../platform/logger/index.js";
import type { CommentStore } from "../store/comments.js";
import type { AgentRunner, RunHandle } from "../types.js";

interface RunWatcher {
  readonly reconcile: (
    projectId: string,
    directionId: string,
    list: readonly DesignComment[]
  ) => Promise<void>;
  readonly watch: (
    projectId: string,
    directionId: string,
    handle: RunHandle
  ) => void;
}

interface RunWatchDeps {
  readonly files: CommentStore;
  readonly runner: AgentRunner;
  readonly runsDir: (projectId: string) => string;
}

interface RunOutcome {
  readonly runId: string;
  readonly status: string;
  readonly versionId: string | null;
}

interface RunRef {
  readonly directionId: string;
  readonly projectId: string;
}

const readSummary = async (file: string): Promise<RunSummary | null> => {
  try {
    const text = await readFile(file, "utf-8");

    return JSON.parse(text) as RunSummary;
  } catch {
    return null;
  }
};

const sentRunIds = (list: readonly DesignComment[]): string[] => [
  ...new Set(
    list.flatMap((comment) => {
      if (comment.status === "sent" && comment.runId) {
        return [comment.runId];
      }

      return [];
    })
  ),
];

const toFinalStatus = (summary: RunSummary | null): string => {
  if (summary && summary.status !== "running") {
    return summary.status;
  }

  return "failed";
};

const settleRun = async (
  files: CommentStore,
  ref: RunRef,
  outcome: RunOutcome
): Promise<void> => {
  try {
    await files.finishRun(ref.projectId, ref.directionId, outcome);
  } catch (error) {
    logError("[comments] finish failed", error);
  }
};

const awaitRun = async (
  files: CommentStore,
  ref: RunRef,
  handle: RunHandle
): Promise<void> => {
  try {
    const summary = await handle.done;

    await settleRun(files, ref, {
      runId: handle.runId,
      status: summary.status,
      versionId: summary.versionId,
    });
  } catch {
    await settleRun(files, ref, {
      runId: handle.runId,
      status: "failed",
      versionId: null,
    });
  }
};

const createRunWatcher = (deps: RunWatchDeps): RunWatcher => {
  const watched = new Set<string>();

  const watch = (
    projectId: string,
    directionId: string,
    handle: RunHandle
  ): void => {
    if (watched.has(handle.runId)) {
      return;
    }

    watched.add(handle.runId);
    void awaitRun(deps.files, { directionId, projectId }, handle);
  };

  const settleOne = async (ref: RunRef, runId: string): Promise<void> => {
    const handle = deps.runner.get(runId);

    if (handle) {
      watch(ref.projectId, ref.directionId, handle);

      return;
    }

    const summary = await readSummary(
      path.join(deps.runsDir(ref.projectId), `${runId}.json`)
    );

    await settleRun(deps.files, ref, {
      runId,
      status: toFinalStatus(summary),
      versionId: summary?.versionId ?? null,
    });
  };

  const reconcile = async (
    projectId: string,
    directionId: string,
    list: readonly DesignComment[]
  ): Promise<void> => {
    const ref = { directionId, projectId };

    await Promise.all(sentRunIds(list).map((runId) => settleOne(ref, runId)));
  };

  return { reconcile, watch };
};

export { createRunWatcher };

export type { RunWatcher };
