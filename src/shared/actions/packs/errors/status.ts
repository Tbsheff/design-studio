import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { PacksErrorTag } from "./index.js";

const PacksStatus = {
  CheckFailed: 409,
  PackExists: 409,
} as const satisfies Record<PacksErrorTag, HttpStatus>;

export { PacksStatus };
