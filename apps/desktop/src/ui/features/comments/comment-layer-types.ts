import type { MutableRefObject } from "react";

import type { ActiveFrame } from "./comment-anchors.js";
import type { ComposerSources } from "./comment-composer-model.js";
import type { AnchorQuery, ProjectKind, SelectionContext } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";
import type { CommentPick } from "./use-pick.js";

interface FrameSet {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
}

interface CommentTools {
  sources: ComposerSources;
  pageName: string;
  onSteer?: (text: string) => void;
}

interface Props {
  control: CommentsControl;
  frames: FrameSet;
  kind: ProjectKind;
  zoom: number;
  frame: { width: number; height: number };
  commentMode: boolean;
  selectMode: boolean;
  editing?: boolean;
  selection: SelectionContext[];
  onExitCommentMode: () => void;
  tools: CommentTools;
  activeFrame?: ActiveFrame;
}

interface TrackInput {
  commentMode: boolean;
  control: CommentsControl;
  frames: FrameSet;
  kind: ProjectKind;
  onExitCommentMode: () => void;
  queries: AnchorQuery[];
  setPick: CommentPick["setPick"];
}

export type { CommentTools, FrameSet, Props, TrackInput };
