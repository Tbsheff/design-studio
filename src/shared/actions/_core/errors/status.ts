import type { HttpStatus } from "./http-status-codes.js";
import type { CoreErrorTag } from "./index.js";

const CoreStatus = {
  BadRequest: 400,
  Conflict: 409,
  Forbidden: 403,
  NotFound: 404,
  NotImplemented: 501,
  PickApp: 409,
} as const satisfies Record<CoreErrorTag, HttpStatus>;

export { CoreStatus };
