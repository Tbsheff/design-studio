import type { MutableRefObject } from "react";

import type {
  AnchorQuery,
  CommentDrawing,
  CommentFrame,
  CommentPrefill,
  CommentStatus,
  CommentTarget,
  DesignComment,
  RunMention,
  SelectionContext,
} from "./deps.js";

type DescribeAnchors = (
  queries: AnchorQuery[]
) => Promise<(SelectionContext | null)[]>;

interface CommentPatch {
  text?: string;
  status?: CommentStatus;
  target?: CommentTarget;
  context?: SelectionContext;
}

interface CommentExtras {
  mentions?: RunMention[];
  attachmentIds?: string[];
  offset?: CommentTarget["offset"];
}

interface DrawingInput {
  text: string;
  drawing: CommentDrawing;
  image: Blob;
  toClaude: boolean;
  extras?: CommentExtras;
}

interface CommentsControl {
  directionId: string | null;
  composerActive: boolean;
  running: boolean;
  comments: DesignComment[];
  queued: DesignComment[];
  inChat: DesignComment[];
  notice: string | null;
  sending: boolean;
  openId: string | null;
  repinId: string | null;
  describeRef: MutableRefObject<DescribeAnchors | null>;
  setOpenId: (id: string | null) => void;
  setRepinId: (id: string | null) => void;
  clearNotice: () => void;
  add: (
    selections: SelectionContext[],
    text: string,
    toClaude: boolean,
    extras?: CommentExtras
  ) => Promise<boolean>;
  update: (id: string, patch: CommentPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
  move: (id: string, delta: -1 | 1) => Promise<void>;
  send: (ids?: string[]) => Promise<void>;
  repin: (
    id: string,
    selection: SelectionContext,
    offset?: CommentTarget["offset"]
  ) => Promise<void>;
  addDrawing: (input: DrawingInput) => Promise<boolean>;
  reply: (id: string, text: string) => Promise<boolean>;
  removeReply: (id: string, replyId: string) => Promise<void>;
  showResolved: boolean;
  setShowResolved: (on: boolean) => void;
  frameRef: MutableRefObject<CommentFrame | null>;
  picked: string[];
  togglePick: (id: string) => void;
  clearPicked: () => void;
  toChat: (ids: string[]) => Promise<void>;
  preparing: boolean;
}

type OnPrefill = (prefill: CommentPrefill) => void;

export type {
  CommentExtras,
  CommentPatch,
  CommentsControl,
  DescribeAnchors,
  DrawingInput,
  OnPrefill,
};
