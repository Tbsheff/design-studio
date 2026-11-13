import type { RunRequest } from "@design-studio/contracts";
import { startTransition, useEffect, useRef } from "react";

import { api } from "../../api";
import {
  onSelectionPromptChat,
  onSelectionPromptSend,
  onSelectionStop,
  setSelectionRunEnd,
  setSelectionRunning,
} from "../../platform/ask-chat";
import { useLatest } from "../../platform/use-latest";
import { composeRequest } from "./request-model";
import type { StudioStart } from "./studio-run-types";
import type { StudioRunInput } from "./use-studio-run";

interface SentPrompt {
  readonly isStopped: boolean;
  readonly prompt: string;
  readonly sentAt: number;
}

type RunEntry = StudioRunInput["core"]["runs"][string];

const RUN_CLOCK_SLACK_MS = 5000;

const ignoreFailure = (): null => null;

const toSelectionRequest = (input: StudioRunInput, text: string): RunRequest =>
  composeRequest({
    attachmentIds: [],
    canvas: input.core.runCanvas.current(),
    effort: null,
    focusPaths: [],
    level: input.project.settings.defaultLevel,
    mentions: [],
    mode: "edit",
    prompt: text,
    selection: input.ui.selection,
  });

const toSentRun = (
  runs: StudioRunInput["core"]["runs"],
  sent: SentPrompt
): RunEntry | null =>
  Object.values(runs).find(
    (run): boolean =>
      run.request?.prompt === sent.prompt &&
      run.startedAt >= sent.sentAt - RUN_CLOCK_SLACK_MS
  ) ?? null;

const cancelRunId = (projectId: string, runId: string): void => {
  startTransition(async (): Promise<void> => {
    try {
      await api.cancelRun(projectId, runId);
    } catch {
      ignoreFailure();
    }
  });
};

const useSelectionRunEnd = (
  input: StudioRunInput
): { current: SentPrompt | null } => {
  const sent = useRef<SentPrompt | null>(null);
  const { runs } = input.core;
  const { projectId } = input;

  useEffect(() => {
    const { current } = sent;

    if (current === null) {
      return;
    }

    const run = toSentRun(runs, current);

    if (run === null) {
      return;
    }

    if (current.isStopped) {
      sent.current = null;

      if (run.status === "running") {
        cancelRunId(projectId, run.runId);
      }

      return;
    }

    if (run.status !== "running") {
      sent.current = null;
      setSelectionRunEnd({ prompt: current.prompt, status: run.status });
    }
  }, [projectId, runs]);

  return sent;
};

const useSelectionPromptRun = (
  input: StudioRunInput,
  startRun: StudioStart["startRun"]
): void => {
  const latest = useLatest({ input, startRun });
  const sent = useSelectionRunEnd(input);
  const isRunning = input.core.activeRun !== null;

  useEffect(
    () =>
      onSelectionPromptSend((prompt: string): void => {
        const { input: current, startRun: start } = latest.current;
        const request = toSelectionRequest(current, prompt);

        const sentAt = Date.now();

        sent.current = { isStopped: false, prompt, sentAt };

        void current.ui.act(async (): Promise<void> => {
          try {
            await start(request, true);
          } catch (error) {
            sent.current = null;
            setSelectionRunEnd({ prompt, status: "failed" });
            throw error;
          }
        });
      }),
    [latest, sent]
  );

  useEffect(
    () =>
      onSelectionStop((): void => {
        const { input: current } = latest.current;
        const run = current.core.activeRun;

        if (run !== null) {
          sent.current = null;
          cancelRunId(current.projectId, run.runId);

          return;
        }

        if (sent.current !== null) {
          sent.current = { ...sent.current, isStopped: true };
        }
      }),
    [latest, sent]
  );

  useEffect(
    () =>
      onSelectionPromptChat((text: string): void => {
        latest.current.input.ui.prefillChat.current({
          attachments: [],
          commentIds: [],
          text,
        });
      }),
    [latest]
  );

  useEffect(() => {
    setSelectionRunning(isRunning);
  }, [isRunning]);
};

export { useSelectionPromptRun };
