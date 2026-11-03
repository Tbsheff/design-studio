import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { DirectEditErrorTag } from "./index.js";

const DirectEditStatus = {
  DirectEditConflict: 409,
  DirectEditFailed: 422,
  DirectEditNotFound: 404,
} as const satisfies Record<DirectEditErrorTag, HttpStatus>;

export { DirectEditStatus };
