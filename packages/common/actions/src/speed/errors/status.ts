import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { SpeedErrorTag } from "./index.js";

const SpeedStatus = {} as const satisfies Record<SpeedErrorTag, HttpStatus>;

export { SpeedStatus };
