import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { PageErrorTag } from "./index.js";

const PageStatus = {} as const satisfies Record<PageErrorTag, HttpStatus>;

export { PageStatus };
