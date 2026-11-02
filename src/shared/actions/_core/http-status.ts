// @generated
import type { StudioErrorTag } from "./errors/all.js";
import type { HttpStatus } from "./errors/http-status-codes.js";
import { CoreStatus } from "./errors/status.js";

const HTTP_STATUS = {
  ...CoreStatus,
  Defect: 500,
} as const satisfies Record<StudioErrorTag | "Defect", HttpStatus>;

const statusOf = (tag: StudioErrorTag | "Defect"): HttpStatus =>
  HTTP_STATUS[tag];

export { HTTP_STATUS, statusOf };
