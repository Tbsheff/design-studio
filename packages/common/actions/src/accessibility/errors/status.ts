import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { AccessibilityErrorTag } from "./index.js";

const AccessibilityStatus = {} as const satisfies Record<
  AccessibilityErrorTag,
  HttpStatus
>;

export { AccessibilityStatus };
