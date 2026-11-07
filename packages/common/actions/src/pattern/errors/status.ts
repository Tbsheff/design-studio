import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { PatternErrorTag } from "./index.js";

const PatternStatus = {} as const satisfies Record<PatternErrorTag, HttpStatus>;

export { PatternStatus };
