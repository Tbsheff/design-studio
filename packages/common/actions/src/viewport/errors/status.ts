import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ViewportErrorTag } from "./index.js";

const ViewportStatus = {} as const satisfies Record<
  ViewportErrorTag,
  HttpStatus
>;

export { ViewportStatus };
