import type { RunRequest } from "@design-studio/contracts";
import { useEffect } from "react";

import {
  onSelectionPromptChat,
  onSelectionPromptSend,
  setSelectionRunning,
} from "../../platform/ask-chat";
import { useLatest } from "../../platform/use-latest";
import { composeRequest } from "./request-model";
import type { StudioStart } from "./studio-run-types";
import type { StudioRunInput } from "./use-studio-run";

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

const useSelectionPromptRun = (
  input: StudioRunInput,
  startRun: StudioStart["startRun"]
): void => {
  const latest = useLatest({ input, startRun });
  const isRunning = input.core.activeRun !== null;

  useEffect(
    () =>
      onSelectionPromptSend((prompt: string): void => {
        const { input: current, startRun: start } = latest.current;
        const request = toSelectionRequest(current, prompt);

        void current.ui.act(async (): Promise<void> => {
          await start(request, true);
        });
      }),
    [latest]
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
