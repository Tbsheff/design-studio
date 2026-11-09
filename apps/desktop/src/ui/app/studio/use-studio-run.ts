import type { Project, RunRequest } from "@design-studio/contracts";
import { statesPrompt } from "@design-studio/contracts/states";

import { api } from "../../api";
import { canvasStore } from "../../features/canvas/canvas-frames-model";
import type { CanvasFrame } from "../../features/canvas/canvas-frames-model";
import { activeFrame, defaultLayout } from "../../features/canvas/index";
import { emptyRun } from "../../features/chat/run-state-model";
import type { RunView } from "../../features/chat/run-state-model";
import { useRunControls } from "../../features/chat/use-run-controls";
import type { TrackSend } from "../../features/chat/use-run-controls";
import { POLISH_REQUEST } from "../../features/inspector/polish-model";
import { TWEAKS_REQUEST } from "../../features/inspector/use-tweaks";
import { randomToken } from "../../platform/session";
import { uiStore } from "../../platform/storage";
import {
  buildPlanRequest,
  composeRequest,
  withCommentIds,
} from "./request-model";
import type { StudioCore } from "./studio-core-types";
import type {
  StudioRun,
  StudioSendArgs,
  StudioStart,
} from "./studio-run-types";
import type { StudioPanes, StudioUi } from "./studio-ui-types";

interface StudioRunInput {
  projectId: string;
  project: Project;
  ui: StudioUi;
  panes: StudioPanes;
  core: StudioCore;
}

interface SendJob {
  input: StudioRunInput;
  track: TrackSend;
  directionId: string;
  request: RunRequest;
  pending: RunView | null;
}

const clearPending = (core: StudioCore, settled: RunView | null): void => {
  if (settled) {
    core.setPendingRun((current: RunView | null): RunView | null => {
      if (current === settled) {
        return null;
      }

      return current;
    });
  }
};

const sendRequest = async (job: SendJob): Promise<void> => {
  const { input, track, directionId, request, pending } = job;
  const { data } = input.core;
  const cancelSend = data.noteSend();

  try {
    const { runId, stopped } = await track(
      (): ReturnType<typeof api.startRun> =>
        api.startRun(input.projectId, directionId, request)
    );

    if (stopped) {
      data.seedStoppedRun(runId, directionId, request);
    } else {
      data.seedRun(runId, directionId, request);
    }
  } catch (error) {
    cancelSend();
    throw error;
  } finally {
    clearPending(input.core, pending);
  }
};

const startOptimistic = (
  input: StudioRunInput,
  request: RunRequest,
  directionId: string
): RunView => {
  const pending = emptyRun(
    `pending-${randomToken()}`,
    directionId,
    Date.now(),
    request
  );

  input.core.setPendingRun(pending);

  return pending;
};

const useStudioStart = (input: StudioRunInput): StudioStart => {
  const { projectId, ui, core } = input;

  const { trackSend, ...runControls } = useRunControls(
    projectId,
    core.activeRun,
    ui.draft,
    ui.act
  );

  const startRun = async (
    request: RunRequest,
    optimistic = false
  ): Promise<void> => {
    const { directionId } = core;

    if (!directionId) {
      return;
    }

    let pending: RunView | null = null;

    if (optimistic) {
      pending = startOptimistic(input, request, directionId);
    }

    await sendRequest({
      directionId,
      input,
      pending,
      request,
      track: trackSend,
    });

    ui.setSource({ kind: "live" });
  };

  return { runControls, startRun };
};

const suggestRequestOf = (prompt?: string): RunRequest => {
  if (prompt) {
    return {
      ...TWEAKS_REQUEST,
      prompt: `${TWEAKS_REQUEST.prompt}\n\nThe user asked for: ${prompt}`,
    };
  }

  return TWEAKS_REQUEST;
};

const useStudioQuick = (
  input: StudioRunInput,
  startRun: StudioStart["startRun"]
): Omit<StudioRun, "makeStates" | "runControls" | "startRun"> => {
  const { ui, core } = input;
  const { act } = ui;

  const withCanvas = (request: RunRequest): RunRequest => {
    const canvas = core.runCanvas.current();

    if (canvas) {
      return { ...request, canvas };
    }

    return request;
  };

  const send = (...args: StudioSendArgs): Promise<void> => {
    const [text, composerMode, files, runLevel, runEffort, picks, commentIds] =
      args;

    const request = composeRequest({
      attachmentIds: files,
      canvas: core.runCanvas.current(),
      effort: runEffort,
      level: runLevel,
      mentions: picks,
      mode: composerMode,
      prompt: text,
      selection: ui.selection,
    });

    return startRun(withCommentIds(request, commentIds ?? []), true);
  };

  const suggestTweaks = (prompt?: string): Promise<void> =>
    act((): Promise<void> => startRun(suggestRequestOf(prompt)));

  const polish = (): Promise<void> =>
    act((): Promise<void> => startRun(withCanvas(POLISH_REQUEST)));

  const approvePlan = (run: RunView): Promise<void> =>
    act((): Promise<void> => startRun(withCanvas(buildPlanRequest(run))));

  const retryRun = async (run: RunView): Promise<void> => {
    const { request } = run;

    if (request) {
      await act((): Promise<void> =>
        startRun({ ...request, retryOf: run.runId })
      );
    }
  };

  return { approvePlan, polish, retryRun, send, suggestTweaks };
};

const useStudioRun = (input: StudioRunInput): StudioRun => {
  const { projectId, project, ui } = input;
  const { runControls, startRun } = useStudioStart(input);
  const quick = useStudioQuick(input, startRun);

  const makeStates = (frame?: CanvasFrame): Promise<void> => {
    const target =
      frame ??
      activeFrame(
        canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport)
      );

    const framePath = target.path ?? "";

    const request: RunRequest = {
      level: project.settings.defaultLevel,
      mode: "edit",
      prompt: statesPrompt(framePath || project.entry),
      states: {
        frame: target.id,
        height: target.height,
        path: framePath,
        width: target.width,
      },
    };

    return ui.act((): Promise<void> => startRun(request, true));
  };

  return { ...quick, makeStates, runControls, startRun };
};

export { useStudioRun };

export type { StudioRunInput };
