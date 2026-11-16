import type { Direction, Project, RunMention } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import {
  DEFAULT_FRAME_STATE,
  stateLabel,
} from "@design-studio/contracts/frame-state";
import type { FrameStatesView } from "@design-studio/contracts/frame-state";

import type { MentionFile, MentionFrame } from "../../shared/server-ports.js";
import { routeFileOf } from "../agent/index.js";
import { frameStatesView, stateOfFrame } from "../app/index.js";
import type { CanvasService } from "../canvas/index.js";
import { BadRequestError } from "../platform/errors/index.js";
import { readMentionFiles } from "./mentions.js";

interface MentionTarget {
  readonly project: Project;
  readonly direction: Direction;
}

interface MentionFrameDeps extends MentionTarget {
  readonly canvas: CanvasService;
  readonly projects: { readonly projectDir: (projectId: string) => string };
}

interface MentionContext {
  readonly mentionFiles: MentionFile[];
  readonly mentionFrames: MentionFrame[];
}

const toMissingFrameText = (frameId: string): string =>
  `No frame ${frameId} in this design. Call canvas_list for frame ids.`;

const toSettled = async <Value>(
  run: () => Promise<Value>,
  fallback: Value
): Promise<Value> => {
  try {
    return await run();
  } catch {
    return fallback;
  }
};

const toFrameIds = (mentions: readonly RunMention[]): string[] => [
  ...new Set(
    mentions.flatMap((mention) => {
      if (mention.kind === "frame") {
        return [mention.frameId];
      }

      return [];
    })
  ),
];

const toStatesView = (
  deps: MentionFrameDeps,
  project: Project
): Promise<FrameStatesView | null> => {
  if (!project.app) {
    return Promise.resolve(null);
  }

  return toSettled(
    () => frameStatesView(deps.projects.projectDir(project.id)),
    null
  );
};

const toStateText = (view: FrameStatesView | null, frameId: string): string => {
  if (view === null) {
    return DEFAULT_FRAME_STATE;
  }

  const state = stateOfFrame(view, frameId);

  return stateLabel(view, state) ?? state;
};

const isFrameOfDirection = (
  frame: CanvasFileFrame,
  direction: Direction
): boolean => !frame.directionId || frame.directionId === direction.id;

const toSavedFrames = async (
  deps: MentionFrameDeps,
  project: Project
): Promise<readonly CanvasFileFrame[]> => {
  const snapshot = await toSettled(() => deps.canvas.read(project), null);

  return snapshot?.canvas?.frames ?? [];
};

const toMentionFrame = async (
  target: MentionTarget,
  frame: CanvasFileFrame,
  view: FrameStatesView | null
): Promise<MentionFrame> => {
  const framePath = frame.path ?? "";

  return {
    height: frame.height,
    id: frame.id,
    label: frame.label ?? null,
    pageFile: await toSettled(
      () => routeFileOf(target.project, target.direction, framePath),
      null
    ),
    path: framePath,
    state: toStateText(view, frame.id),
    width: frame.width,
  };
};

const toMentionFrames = async (
  deps: MentionFrameDeps,
  frameIds: readonly string[]
): Promise<MentionFrame[]> => {
  const [frames, view] = await Promise.all([
    toSavedFrames(deps, deps.project),
    toStatesView(deps, deps.project),
  ]);

  return Promise.all(
    frameIds.map((frameId) => {
      const frame = frames.find((saved) => saved.id === frameId);

      if (!frame || !isFrameOfDirection(frame, deps.direction)) {
        throw new BadRequestError(toMissingFrameText(frameId));
      }

      return toMentionFrame(deps, frame, view);
    })
  );
};

const toPageMentions = (frames: readonly MentionFrame[]): RunMention[] =>
  frames.flatMap((frame): RunMention[] => {
    if (frame.pageFile === null) {
      return [];
    }

    return [{ kind: "file", path: frame.pageFile }];
  });

const toMentionContext = async (
  deps: MentionFrameDeps,
  mentions: readonly RunMention[] | undefined
): Promise<MentionContext> => {
  const list = mentions ?? [];
  const frameIds = toFrameIds(list);
  let mentionFrames: MentionFrame[] = [];

  if (frameIds.length > 0) {
    mentionFrames = await toMentionFrames(deps, frameIds);
  }

  const mentionFiles = await readMentionFiles(deps.direction.workTree, [
    ...list,
    ...toPageMentions(mentionFrames),
  ]);

  return { mentionFiles, mentionFrames };
};

export { toMentionContext };

export type { MentionContext, MentionFrameDeps };
