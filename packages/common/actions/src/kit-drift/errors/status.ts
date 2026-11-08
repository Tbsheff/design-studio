import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { KitDriftErrorTag } from "./index.js";

const KitDriftStatus = {} as const satisfies Record<
  KitDriftErrorTag,
  HttpStatus
>;

export { KitDriftStatus };
