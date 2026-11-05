import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { TextStyleErrorTag } from "./index.js";

const TextStyleStatus = {} as const satisfies Record<
  TextStyleErrorTag,
  HttpStatus
>;

export { TextStyleStatus };
