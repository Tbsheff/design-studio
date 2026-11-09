import type { ProjectKind, SelectionContext } from "@design-studio/contracts";
import type { MutableRefObject } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import type { PlayCommentOptions } from "./play-comment-types.js";

interface PrototypeOptions {
  projectId: string;
  kind: ProjectKind;
  directionId: string | null;
  frames: CanvasFrame[];
  shown: CanvasFrame[];
  active: CanvasFrame;
  baseUrl: string | null;
  live: boolean;
  selection: SelectionContext[];
  clearSelection: () => void;
  sandbox?: string;
  notify: (message: string) => void;
  playComment: PlayCommentOptions | null;
  focusStage: () => void;
  on: boolean;
  preview: {
    frontToken: string | null;
    slots: { token: string; src: string }[];
    elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  };
  passive: {
    slots: { id: string; token: string; src: string | null }[];
    elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  };
}

export type { PrototypeOptions };
