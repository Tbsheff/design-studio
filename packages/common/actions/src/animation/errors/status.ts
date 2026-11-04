import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { AnimationErrorTag } from "./index.js";

const AnimationStatus = {} as const satisfies Record<
  AnimationErrorTag,
  HttpStatus
>;

export { AnimationStatus };
