import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { StateStyleErrorTag } from "./index.js";

const StateStyleStatus = {} as const satisfies Record<
  StateStyleErrorTag,
  HttpStatus
>;

export { StateStyleStatus };
