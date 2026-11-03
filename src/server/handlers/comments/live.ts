import { Layer } from "effect";

import {
  CommentRunStarter,
  CommentStore,
  CommentThreadStore,
} from "../../comments/index.js";

const CommentsLive = Layer.mergeAll(
  CommentStore.layer,
  CommentThreadStore.layer,
  CommentRunStarter.layer
);

export { CommentsLive };
