import type {
  BridgeToParent,
  ParentToBridge,
  SelectionContext,
} from "@design-studio/contracts";

import type { createAnchorTracker } from "./anchor-tracker.js";
import type { createForceState } from "./force-state.js";
import type { createFreeMove } from "./free-move.js";
import type { LayerIndex } from "./layers.js";
import type { createLivePreview, createPreviewStyles } from "./live-preview.js";
import type { LockSet } from "./locks.js";
import type { createMarquee } from "./marquee.js";
import type { createOptimistic } from "./optimistic.js";
import type { OutlineView } from "./outline-view.js";
import type { createTriggerBridge } from "./play-triggers.js";
import type { createLinkBridge } from "./play.js";
import type { createRectTracker } from "./rect-tracker.js";
import type { BridgeSession } from "./session.js";
import type { createSharePointer } from "./share-pointer.js";
import type { createTextEditor } from "./text-edit.js";
import type { createThemeControl } from "./theme-control.js";

type Rect = SelectionContext["rect"];

type OutgoingBody = BridgeToParent extends infer Message
  ? Message extends BridgeToParent
    ? Omit<Message, "ns" | "token">
    : never
  : never;

type Post = (body: OutgoingBody) => void;

interface BridgeState {
  mode: "select" | "none";
  isMarqueeOn: boolean;
  hoverFrame: number;
  pendingHover: Element | null;
  lastHover: Element | null;
  selected: Element | null;
  selectedAt: number;
  tracked: string[];
  isAltHeld: boolean;
  isLastAltHeld: boolean;
  isForcedDark: boolean;
}

interface SelectionPosts {
  postHover: (element: Element | null, source?: "tree") => void;
  postSelect: (
    element: Element,
    additive: boolean,
    point?: { x: number; y: number }
  ) => void;
  postSelectMany: (elements: Element[], additive: boolean) => Promise<void>;
  repostSelected: () => void;
}

type BridgeCore = {
  session: BridgeSession;
  state: BridgeState;
  post: Post;
  layers: LayerIndex;
  locks: LockSet;
  hitOf: (event: Event) => Element | null;
  textEditor: ReturnType<typeof createTextEditor>;
  links: ReturnType<typeof createLinkBridge>;
  triggers: ReturnType<typeof createTriggerBridge>;
  anchors: ReturnType<typeof createAnchorTracker>;
  rects: ReturnType<typeof createRectTracker>;
  livePreview: ReturnType<typeof createLivePreview>;
  optimistic: ReturnType<typeof createOptimistic>;
  outlineView: OutlineView;
  previewStyles: ReturnType<typeof createPreviewStyles>;
  themeControl: ReturnType<typeof createThemeControl>;
  forceState: ReturnType<typeof createForceState>;
  sharePointer: ReturnType<typeof createSharePointer>;
} & SelectionPosts;

type BridgeContext = {
  marquee: ReturnType<typeof createMarquee>;
  freeMove: ReturnType<typeof createFreeMove>;
  block: (event: Event) => void;
} & BridgeCore;

type MessageHandlers = {
  [Type in ParentToBridge["type"]]: (
    message: Extract<ParentToBridge, { type: Type }>
  ) => void;
};

export type {
  BridgeContext,
  BridgeCore,
  BridgeState,
  MessageHandlers,
  OutgoingBody,
  Post,
  Rect,
  SelectionPosts,
};
