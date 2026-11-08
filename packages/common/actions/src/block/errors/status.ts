import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { BlockErrorTag } from "./index.js";

const BlockStatus = {} as const satisfies Record<BlockErrorTag, HttpStatus>;

export { BlockStatus };
