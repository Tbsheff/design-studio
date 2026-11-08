import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { LayerStyleErrorTag } from "./index.js";

const LayerStyleStatus = {} as const satisfies Record<
  LayerStyleErrorTag,
  HttpStatus
>;

export { LayerStyleStatus };
