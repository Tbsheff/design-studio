import type { ProjectKind } from "@design-studio/contracts";
import type { ComponentType, MutableRefObject } from "react";

import type { commentToolsOf } from "./canvas-helpers.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { Props } from "./canvas-types.js";

type PlayCommentControl = NonNullable<Props["comments"]>;

type PlayCommentTools = ReturnType<typeof commentToolsOf>;

interface PlayCommentInput {
  readonly control: PlayCommentControl;
  readonly elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  readonly frame: CanvasFrame;
  readonly frames: readonly CanvasFrame[];
  readonly height: number;
  readonly isActive: boolean;
  readonly isOn: boolean;
  readonly kind: ProjectKind;
  readonly onExit: () => void;
  readonly scale: number;
  readonly src: string;
  readonly token: string;
  readonly tools: PlayCommentTools;
  readonly width: number;
}

interface PlayCommentOptions {
  readonly Layer: ComponentType<PlayCommentInput>;
  readonly control: PlayCommentControl;
  readonly toTools: (path: string) => PlayCommentTools;
}

export type { PlayCommentInput, PlayCommentOptions };
