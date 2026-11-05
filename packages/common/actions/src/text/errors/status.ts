import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { TextErrorTag } from "./index.js";

const TextStatus = {} as const satisfies Record<TextErrorTag, HttpStatus>;

export { TextStatus };
