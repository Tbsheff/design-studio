import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { FillErrorTag } from "./index.js";

const FillStatus = {} as const satisfies Record<FillErrorTag, HttpStatus>;

export { FillStatus };
