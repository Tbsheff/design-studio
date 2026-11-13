import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { PortErrorTag } from "./index.js";

const PortStatus = {} as const satisfies Record<PortErrorTag, HttpStatus>;

export { PortStatus };
