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
} from "@design-studio/actions/_core/contracts";

export { ApiError, api, errorText, json } from "../../api.js";

export { postToFrame, useBridge } from "../../platform/bridge.js";

export type { BridgeFrame } from "../../platform/bridge.js";

export { canvasStore, shownFrames } from "../canvas/canvas-frames-model.js";

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

export { Icon } from "../../kit/Icon.js";

export { findElement, findElements } from "../../platform/find-element.js";

export { createLiveStore, useLive } from "../../platform/live-store.js";

export { readStored, writeStored } from "../../platform/storage.js";

export { isTypingTarget } from "../../platform/typing-target.js";

export { projectFromPath } from "../../platform/router.js";

export type { DraftStore } from "../../platform/storage.js";

export type { JsonBody } from "../../platform/http.js";

export { INLINE_PROMPT_OPEN_EVENT } from "../chat/use-inline-prompt.js";

export { useMentions } from "../chat/use-mentions.js";

export { useProfileInitial } from "../home/use-profile-initial.js";
