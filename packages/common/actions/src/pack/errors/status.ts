import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { PackErrorTag } from "./index.js";

const PackStatus = {
  CheckFailed: 409,
  PackExists: 409,
} as const satisfies Record<PackErrorTag, HttpStatus>;

export { PackStatus };
