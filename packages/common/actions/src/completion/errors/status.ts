import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { CompletionErrorTag } from "./index.js";

const CompletionStatus = {} as const satisfies Record<
  CompletionErrorTag,
  HttpStatus
>;

export { CompletionStatus };
