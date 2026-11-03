import type { Project, RunRequest } from "../../../shared/contracts";
import { statesPrompt } from "../../../shared/states";
import type { InlineRunExtras } from "../../../shared/usage-scope";
import { api } from "../../api";
import { activeFrame, canvasStore, defaultLayout } from "../../canvasFrames";
import type { CanvasFrame } from "../../canvasFrames";
import { POLISH_REQUEST } from "../../features/inspector";
import { emptyRun } from "../../runState";
import type { RunView } from "../../runState";
import { randomToken } from "../../session";
import { uiStore } from "../../storage";
import { useRunControls } from "../../useRunControls";
import type { TrackSend } from "../../useRunControls";
import { TWEAKS_REQUEST } from "../../useTweaks";
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

    data.seedRun(runId, directionId, request, stopped);
  } catch (error) {
    cancelSend();
    throw error;
  } finally {
    clearPending(input.core, pending);
  }
};

const startOptimistic = (
  input: StudioRunInput,
  showChat: () => void,
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
  showChat();

  return pending;
};

const useStudioStart = (input: StudioRunInput): StudioStart => {
  const { projectId, ui, panes, core } = input;

  const { trackSend, ...runControls } = useRunControls(
    projectId,
    core.activeRun,
    ui.draft,
    ui.act
  );

  const showChatAfterRun = (): void => {
    if ((ui.editSession.current?.count ?? 0) === 0) {
      panes.panel.show("chat");
    }
  };

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
      pending = startOptimistic(input, showChatAfterRun, request, directionId);
    }

    await sendRequest({
      directionId,
      input,
      pending,
      request,
      track: trackSend,
    });

    ui.setSource({ kind: "live" });
    showChatAfterRun();
  };

  return { runControls, startRun };
};

const tweakRequestOf = (
  input: StudioRunInput,
  text: string,
  extras?: InlineRunExtras
): RunRequest => {
  const { project, ui, core } = input;

  return {
    ...composeRequest({
      attachmentIds: [],
      canvas: core.runCanvas.current(),
      effort: null,
      level: project.settings.defaultLevel,
      mentions: [],
      mode: "edit",
      prompt: text,
      selection: ui.selection,
    }),
    ...extras,
  };
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

  const tweak = (prompt: string, extras?: InlineRunExtras): Promise<void> =>
    act((): Promise<void> =>
      startRun(tweakRequestOf(input, prompt, extras), true)
    );

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

  return { approvePlan, polish, retryRun, send, suggestTweaks, tweak };
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
