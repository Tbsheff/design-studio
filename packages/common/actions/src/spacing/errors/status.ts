import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { SpacingErrorTag } from "./index.js";

const SpacingStatus = {} as const satisfies Record<SpacingErrorTag, HttpStatus>;

export { SpacingStatus };
