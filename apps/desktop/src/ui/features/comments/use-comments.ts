import { useCallback, useMemo, useRef, useState } from "react";

import type {
  CommentExtras,
  CommentPatch,
  CommentsControl,
  DescribeAnchors,
  OnPrefill,
} from "./comments-control.js";
import { readStored, writeStored } from "./deps.js";
import type { CommentFrame } from "./deps.js";
import { useCommentCall } from "./use-comment-call.js";
import { useCommentChat } from "./use-comment-chat.js";
import type { CommentChat } from "./use-comment-chat.js";
import { useCommentCreates } from "./use-comment-creates.js";
import type { CommentCreates } from "./use-comment-creates.js";
import { useCommentEdits } from "./use-comment-edits.js";
import type { CommentEdits } from "./use-comment-edits.js";
import { usePicks } from "./use-comment-picks.js";
import type { CommentPicks } from "./use-comment-picks.js";
import { useCommentReplies } from "./use-comment-replies.js";
import type { CommentReplies } from "./use-comment-replies.js";
import { useCommentSend } from "./use-comment-send.js";
import type { CommentSend } from "./use-comment-send.js";
import { useCommentStore } from "./use-comment-store.js";
import type { CommentsStore } from "./use-comment-store.js";
import { useLatest } from "./use-latest.js";

const SHOW_RESOLVED_KEY = "studio.comments.showResolved";

const readShowResolved = (): boolean => readStored(SHOW_RESOLVED_KEY) === "1";

const toStoredFlag = (isOn: boolean): string => {
  if (isOn) {
    return "1";
  }

  return "0";
};

interface CommentRefs {
  readonly describeRef: CommentsControl["describeRef"];
  readonly frameRef: CommentsControl["frameRef"];
}

interface CommentsFlags {
  readonly composerActive: boolean;
  readonly onPrefill: OnPrefill | null;
  readonly running: boolean;
}

interface ControlParts {
  readonly chat: CommentChat;
  readonly creates: CommentCreates;
  readonly describeRef: CommentsControl["describeRef"];
  readonly directionId: string | null;
  readonly edits: CommentEdits;
  readonly flags: CommentsFlags;
  readonly frameRef: CommentsControl["frameRef"];
  readonly picks: CommentPicks;
  readonly replies: CommentReplies;
  readonly sender: CommentSend;
  readonly showResolved: boolean;
  readonly store: CommentsStore;
  readonly storeShowResolved: (isOn: boolean) => void;
}

const toControl = (parts: ControlParts): CommentsControl => ({
  ...parts.picks,
  ...parts.creates,
  ...parts.edits,
  ...parts.replies,
  clearNotice: () => parts.store.setNotice(null),
  comments: parts.store.comments,
  composerActive: parts.flags.composerActive,
  describeRef: parts.describeRef,
  directionId: parts.directionId,
  frameRef: parts.frameRef,
  inChat: parts.chat.inChat,
  notice: parts.store.notice,
  openId: parts.store.openId,
  preparing: parts.chat.preparing,
  queued: parts.chat.queued,
  repinId: parts.store.repinId,
  running: parts.flags.running,
  send: parts.sender.send,
  sending: parts.sender.sending,
  setOpenId: parts.store.setOpenId,
  setRepinId: parts.store.setRepinId,
  setShowResolved: parts.storeShowResolved,
  showResolved: parts.showResolved,
  toChat: parts.chat.toChat,
});

const useCommentRefs = (): CommentRefs => {
  const describeRef = useRef<DescribeAnchors | null>(null);
  const frameRef = useRef<CommentFrame | null>(null);

  return { describeRef, frameRef };
};

const useComments = (
  projectId: string,
  directionId: string | null,
  flags: CommentsFlags
): CommentsControl => {
  const [showResolved, setShowResolved] = useState(readShowResolved);
  const { describeRef, frameRef } = useCommentRefs();
  const runningRef = useLatest(flags.running);
  const store = useCommentStore(projectId, directionId);
  const call = useCommentCall(projectId, store.didRef);
  const picks = usePicks(store.comments);
  const { clearPicked } = picks;
  const { onPrefill } = flags;
  const isRunning = flags.running;

  const chat = useCommentChat(
    useMemo(
      () => ({ call, clearPicked, onPrefill, store }),
      [call, clearPicked, onPrefill, store]
    )
  );

  const { chatRef } = chat;

  const sender = useCommentSend(
    useMemo(
      () => ({ call, chatRef, describeRef, isRunning, runningRef, store }),
      [call, chatRef, describeRef, isRunning, runningRef, store]
    )
  );

  const send = sender;

  const creates = useCommentCreates(
    useMemo(
      () => ({ call, frameRef, projectId, runningRef, send, store }),
      [call, frameRef, projectId, runningRef, send, store]
    )
  );

  const editContext = useMemo(() => ({ call, store }), [call, store]);
  const edits = useCommentEdits(editContext);
  const replies = useCommentReplies(editContext);

  const storeShowResolved = useCallback((isOn: boolean): void => {
    setShowResolved(isOn);
    writeStored(SHOW_RESOLVED_KEY, toStoredFlag(isOn));
  }, []);

  return toControl({
    chat,
    creates,
    describeRef,
    directionId,
    edits,
    flags,
    frameRef,
    picks,
    replies,
    sender,
    showResolved,
    store,
    storeShowResolved,
  });
};

export { useComments };

export type {
  CommentExtras,
  CommentPatch,
  CommentsControl,
  CommentsFlags,
  DescribeAnchors,
  OnPrefill,
};
