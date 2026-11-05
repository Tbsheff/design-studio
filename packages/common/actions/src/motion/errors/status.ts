import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { MotionErrorTag } from "./index.js";

const MotionStatus = {} as const satisfies Record<MotionErrorTag, HttpStatus>;

export { MotionStatus };
