import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { PropErrorTag } from "./index.js";

const PropStatus = {} as const satisfies Record<PropErrorTag, HttpStatus>;

export { PropStatus };
