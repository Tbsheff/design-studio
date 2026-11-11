import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { VariationErrorTag } from "./index.js";

const VariationStatus = {} as const satisfies Record<
  VariationErrorTag,
  HttpStatus
>;

export { VariationStatus };
