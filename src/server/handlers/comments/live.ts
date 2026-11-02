import { Layer } from "effect";

import { CommentRunStarter } from "../../comments/comment-run-starter.js";
import { CommentStore } from "../../comments/comment-store.js";
import { CommentThreadStore } from "../../comments/comment-thread-store.js";

const CommentsLive = Layer.mergeAll(
  CommentStore.layer,
  CommentThreadStore.layer,
  CommentRunStarter.layer
);

export { CommentsLive };
