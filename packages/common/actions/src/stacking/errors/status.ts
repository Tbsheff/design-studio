import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { StackingErrorTag } from "./index.js";

const StackingStatus = {} as const satisfies Record<
  StackingErrorTag,
  HttpStatus
>;

export { StackingStatus };
