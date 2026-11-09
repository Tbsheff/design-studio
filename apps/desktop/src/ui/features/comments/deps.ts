export {
  anchorQueryOf,
  canOrphan,
  canPickForChat,
  createOrphanTracker,
  drawingTarget,
  formatLoc,
  hasPin,
  matchesFrame,
  targetFromSelection,
} from "../../../shared/comments.js";

export type { OrphanTracker } from "../../../shared/comments.js";

export type {
  AnchorQuery,
  AnchorReport,
  CommentDrawing,
  CommentFrame,
  CommentPrefill,
  CommentStatus,
  CommentTarget,
  CompiledTokenEntry,
  ComponentInfo,
  DesignComment,
  ProjectKind,
  RunMention,
  SelectionContext,
  SourceLoc,
} from "@design-studio/contracts";

export { ApiError, api, errorText, json } from "../../api.js";

export { postToFrame, useBridge } from "../../platform/bridge.js";

export type { BridgeFrame } from "../../platform/bridge.js";

export { canvasStore } from "../canvas/canvas-frames-model.js";

export { shownFrames } from "../canvas/index.js";

export type { PlayCommentInput } from "../canvas/index.js";

export { DrawingStrokes, PenIcon } from "../canvas/draw-layer.js";

export {
  MentionList,
  mentionIcon,
  mentionKey,
  mentionLabel,
  mentionTitle,
} from "../chat/mention-picker.js";

export type { MentionOption } from "../chat/mention-picker.js";

export type { PendingAttachment } from "../../domain/pending-attachment.js";

export { useProjectEvents } from "../../platform/events.js";

export { Icon } from "@design-studio/ui";

export { findElement, findElements } from "../../platform/find-element.js";

export { createLiveStore, useLive } from "../../platform/live-store.js";

export { readStored, writeStored } from "../../platform/storage.js";

export { isTypingTarget } from "../../platform/typing-target.js";

export { projectFromPath } from "../../platform/router.js";

export type { DraftStore } from "../../platform/storage.js";

export type { JsonBody } from "../../platform/http.js";

export { ASK_CHAT_EVENT } from "../../platform/ask-chat.js";

export { useMentions } from "../chat/use-mentions.js";

export { useProfileInitial } from "../home/use-profile-initial.js";
