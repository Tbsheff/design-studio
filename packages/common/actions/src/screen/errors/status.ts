import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ScreenErrorTag } from "./index.js";

const ScreenStatus = {} as const satisfies Record<ScreenErrorTag, HttpStatus>;

export { ScreenStatus };
