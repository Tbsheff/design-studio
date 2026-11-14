import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { FontErrorTag } from "./index.js";

const FontStatus = {} as const satisfies Record<FontErrorTag, HttpStatus>;

export { FontStatus };
