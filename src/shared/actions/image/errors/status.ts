import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ImageErrorTag } from "./index.js";

const ImageStatus = {} as const satisfies Record<ImageErrorTag, HttpStatus>;

export { ImageStatus };
