import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { BriefErrorTag } from "./index.js";

const BriefStatus = {} as const satisfies Record<BriefErrorTag, HttpStatus>;

export { BriefStatus };
