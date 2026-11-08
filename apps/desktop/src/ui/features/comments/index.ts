import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import type { CommentsPanel as CommentsPanelView } from "./comments-panel.js";

const CommentLayer = lazy(async () => {
  const loaded = await import("./comment-layer.js");

  return { default: loaded.CommentLayer };
});

const CommentsPanel: LazyExoticComponent<typeof CommentsPanelView> = lazy(
  async () => {
    const loaded = await import("./comments-panel.js");

    return { default: loaded.CommentsPanel };
  }
);

const ComposerComments = lazy(async () => {
  const loaded = await import("./composer-comments.js");

  return { default: loaded.ComposerComments };
});

const QueuedComposerBar = lazy(async () => {
  const loaded = await import("./queued-composer-bar.js");

  return { default: loaded.QueuedComposerBar };
});

export { CommentLayer, CommentsPanel, ComposerComments, QueuedComposerBar };

export { authorInitial } from "./author-initial.js";

export { MOD_LABEL } from "./mod-label.js";

export { useComments } from "./use-comments.js";

export { useCommentPrefill } from "./use-comment-prefill.js";

export type {
  CommentExtras,
  CommentPatch,
  CommentsControl,
  DescribeAnchors,
  CommentsFlags,
  OnPrefill,
} from "./use-comments.js";

export type { PrefillRequest } from "./use-comment-prefill.js";
