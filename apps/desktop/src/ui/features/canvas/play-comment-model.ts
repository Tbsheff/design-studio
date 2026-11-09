import type { ProjectKind } from "@design-studio/contracts";
import type {
  DeviceFrameId,
  DeviceOrientation,
} from "@design-studio/contracts/device-frame";
import type { MutableRefObject } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import type { PlayCommentOptions } from "./play-comment-types.js";
import { baseOf, isSettledPhase, overlayOf } from "./play-model.js";
import type { PlayModeProps, Slot, StageSize } from "./play-model.js";

interface PlayCommentMode {
  readonly isOn: boolean;
  readonly setOff: () => void;
  readonly toggle: () => void;
}

interface CommentNodeInput {
  readonly device: DeviceFrameId | null;
  readonly elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  readonly frames: CanvasFrame[];
  readonly frontToken: string | null;
  readonly isOn: boolean;
  readonly kind: ProjectKind;
  readonly onExit: () => void;
  readonly options: PlayCommentOptions;
  readonly orientation: DeviceOrientation;
  readonly stage: StageSize;
}

interface CommentInputArgs {
  readonly device: DeviceFrameId | null;
  readonly elements: CommentNodeInput["elements"];
  readonly mode: PlayCommentMode;
  readonly orientation: DeviceOrientation;
  readonly props: PlayModeProps;
  readonly slots: Slot[];
  readonly stage: StageSize;
}

const toFrontToken = (slots: Slot[]): string | null => {
  const overlay = overlayOf(slots);

  if (overlay && overlay.phase !== "closing") {
    return overlay.token;
  }

  const base = baseOf(slots);

  return (
    base.findLast((slot) => isSettledPhase(slot))?.token ??
    base.at(-1)?.token ??
    null
  );
};

const toCommentInput = (args: CommentInputArgs): CommentNodeInput | null => {
  const { props } = args;

  if (!props.playComment) {
    return null;
  }

  return {
    device: args.device,
    elements: args.elements,
    frames: props.frames,
    frontToken: toFrontToken(args.slots),
    isOn: args.mode.isOn,
    kind: props.kind,
    onExit: args.mode.setOff,
    options: props.playComment,
    orientation: args.orientation,
    stage: args.stage,
  };
};

export { toCommentInput, toFrontToken };

export type { CommentNodeInput, PlayCommentMode };
