import type {
  RunEffort,
  RunLevel,
  RunMention,
  RunRequest,
} from "@design-studio/contracts";

import type { CanvasFrame } from "../../features/canvas/canvas-frames-model";
import type { ComposerMode } from "../../features/chat/run-settings";
import type { RunView } from "../../features/chat/run-state-model";
import type { useRunControls } from "../../features/chat/use-run-controls";

type StudioRunControls = Omit<ReturnType<typeof useRunControls>, "trackSend">;

type StudioSendArgs = [
  prompt: string,
  mode: ComposerMode,
  attachmentIds: string[],
  level: RunLevel,
  effort: RunEffort | null,
  mentions: RunMention[],
  commentIds?: string[],
  focusPaths?: string[],
];

interface StudioRun {
  approvePlan: (run: RunView) => Promise<void>;
  makeStates: (frame?: CanvasFrame) => Promise<void>;
  openTweaks: () => void;
  polish: () => Promise<void>;
  retryRun: (run: RunView) => Promise<void>;
  runControls: StudioRunControls;
  runTweaks: (ask: string) => Promise<void>;
  send: (...args: StudioSendArgs) => Promise<void>;
  startRun: (request: RunRequest, optimistic?: boolean) => Promise<void>;
  suggestTweaks: (prompt?: string) => Promise<void>;
}

interface StudioStart {
  runControls: StudioRunControls;
  startRun: StudioRun["startRun"];
}

export type { StudioRun, StudioRunControls, StudioSendArgs, StudioStart };
