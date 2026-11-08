import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ChartErrorTag } from "./index.js";

const ChartStatus = {} as const satisfies Record<ChartErrorTag, HttpStatus>;

export { ChartStatus };
