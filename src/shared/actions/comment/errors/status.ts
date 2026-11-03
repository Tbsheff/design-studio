import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { CommentErrorTag } from "./index.js";

const CommentStatus = {
  RunInProgress: 409,
} as const satisfies Record<CommentErrorTag, HttpStatus>;

export { CommentStatus };
