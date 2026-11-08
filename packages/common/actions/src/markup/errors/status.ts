import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { MarkupErrorTag } from "./index.js";

const MarkupStatus = {} as const satisfies Record<MarkupErrorTag, HttpStatus>;

export { MarkupStatus };
