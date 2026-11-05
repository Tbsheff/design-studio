import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ComponentVariantErrorTag } from "./index.js";

const ComponentVariantStatus = {} as const satisfies Record<
  ComponentVariantErrorTag,
  HttpStatus
>;

export { ComponentVariantStatus };
