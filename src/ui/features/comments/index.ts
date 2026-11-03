import { lazy } from "react";

const CommentLayer = lazy(async () => {
  const loaded = await import("./comment-layer.js");

  return { default: loaded.CommentLayer };
});

const CommentsPanel = lazy(async () => {
  const loaded = await import("./comments-panel.js");

  return { default: loaded.CommentsPanel };
});

const ComposerComments = lazy(async () => {
  const loaded = await import("./composer-comments.js");

  return { default: loaded.ComposerComments };
});

export { CommentLayer, CommentsPanel, ComposerComments };
