import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { DevStatusErrorTag } from "./index.js";

const DevStatusStatus = {} as const satisfies Record<
  DevStatusErrorTag,
  HttpStatus
>;

export { DevStatusStatus };
