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

export { CommentLayer, CommentsPanel, ComposerComments };

export { useComments } from "./use-comments.js";

export { useCommentPrefill } from "./use-comment-prefill.js";

export type {
  CommentExtras,
  CommentPatch,
  CommentsControl,
  DescribeAnchors,
  OnPrefill,
} from "./use-comments.js";

export type { PrefillRequest } from "./use-comment-prefill.js";
