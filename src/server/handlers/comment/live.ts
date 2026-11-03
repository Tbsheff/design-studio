import { Layer } from "effect";

import {
  CommentRunStarter,
  CommentStore,
  CommentThreadStore,
} from "../../comments/index.js";

const CommentLive = Layer.mergeAll(
  CommentStore.layer,
  CommentThreadStore.layer,
  CommentRunStarter.layer
);

export { CommentLive };
