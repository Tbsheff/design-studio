import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ComponentErrorTag } from "./index.js";

const ComponentStatus = {} as const satisfies Record<
  ComponentErrorTag,
  HttpStatus
>;

export { ComponentStatus };
