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
} from "../../../shared/contracts.js";

export { ApiError, api, errorText, json } from "../../api.js";

export { postToFrame, useBridge } from "../../bridge.js";

export type { BridgeFrame } from "../../bridge.js";

export { canvasStore, shownFrames } from "../../canvasFrames.js";

export { DrawingStrokes, PenIcon } from "../../components/DrawLayer.js";

export {
  MentionList,
  mentionIcon,
  mentionKey,
  mentionLabel,
  mentionTitle,
} from "../../components/MentionPicker.js";

export type { MentionOption } from "../../components/MentionPicker.js";

export type { PendingAttachment } from "../../domain/pending-attachment.js";

export { useProjectEvents } from "../../events.js";

export { Icon } from "../../kit/Icon.js";

export { findElement, findElements } from "../../platform/find-element.js";

export { createLiveStore, useLive } from "../../platform/live-store.js";

export { readStored, writeStored } from "../../platform/storage.js";

export { isTypingTarget } from "../../platform/typing-target.js";

export { projectFromPath } from "../../route.js";

export type { DraftStore } from "../../storage.js";

export { INLINE_PROMPT_OPEN_EVENT } from "../../useInlinePrompt.js";

export { useMentions } from "../../useMentions.js";

export { useProfileInitial } from "../../useProfileInitial.js";
