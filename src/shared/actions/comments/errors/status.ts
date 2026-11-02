import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { CommentsErrorTag } from "./index.js";

const CommentsStatus = {
  RunInProgress: 409,
} as const satisfies Record<CommentsErrorTag, HttpStatus>;

export { CommentsStatus };
