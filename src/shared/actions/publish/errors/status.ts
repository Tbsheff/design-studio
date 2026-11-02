import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { PublishErrorTag } from "./index.js";

const PublishStatus = {
  CfFailed: 502,
} as const satisfies Record<PublishErrorTag, HttpStatus>;

export { PublishStatus };
