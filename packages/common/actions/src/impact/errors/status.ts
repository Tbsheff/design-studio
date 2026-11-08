import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ImpactErrorTag } from "./index.js";

const ImpactStatus = {} as const satisfies Record<ImpactErrorTag, HttpStatus>;

export { ImpactStatus };
