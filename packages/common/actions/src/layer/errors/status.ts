import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { LayerErrorTag } from "./index.js";

const LayerStatus = {} as const satisfies Record<LayerErrorTag, HttpStatus>;

export { LayerStatus };
