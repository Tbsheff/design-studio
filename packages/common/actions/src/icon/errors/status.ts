import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { IconErrorTag } from "./index.js";

const IconStatus = {} as const satisfies Record<IconErrorTag, HttpStatus>;

export { IconStatus };
