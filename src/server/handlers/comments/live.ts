import { Layer } from "effect";

import { CommentStore } from "../../comments/comment-store.js";
import { CommentThreadStore } from "../../comments/comment-thread-store.js";

const CommentsLive = Layer.mergeAll(
  CommentStore.layer,
  CommentThreadStore.layer
);

export { CommentsLive };
